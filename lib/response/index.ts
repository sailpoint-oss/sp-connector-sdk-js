/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Writable } from 'stream'
import type { ScanResult, ScanUnit, ScanUnitFrame } from '../commands/std-secret-scan'
import {
	chunkUtf8,
	DEFAULT_MAX_IN_FLIGHT_SCAN_BYTES,
	DEFAULT_MAX_SCAN_BLOB_BYTES,
	MAX_SCAN_BLOB_BYTES,
	MAX_SCAN_UNIT_BYTES,
	MIN_SCAN_UNIT_BYTES,
	SCAN_CHUNK_OVERLAP_BYTES,
} from './scan-chunk'

/**
 * Response interface
 */
export interface Response<T> {
	send(output: T): void
	saveState(state: any): void
	keepAlive(): void
	patchConfig(patches: Patch[]): void
}

/**
 * Response implementation for sending command output in chunks
 */
export class ResponseStream<T> implements Response<T> {
	protected readonly _writable: Writable

	constructor(writable: Writable) {
		this._writable = writable
	}

	/**
	 * Send command output
	 * @param chunk output chunk
	 */
	send(chunk: T): void {
		this._writable.write(new RawResponse(chunk))
	}

	/**
	 * Save state for stateful command
	 * @param state the end state of running the stateful command
	 */
	saveState(state: any): void {
		this._writable.write(new RawResponse(state, ResponseType.State))
	}

	/**
	 * Indicates that the commands is still running.
	 *
	 * Can be used to avoid a timeout error in the case when a command
	 * is unable to return responses in a timely manner but is still
	 * actively processing the command.
	 */
	keepAlive(): void {
		this._writable.write(new RawResponse({}, ResponseType.KeepAlive))
	}

	patchConfig(patches: Patch[]): void {
		this._writable.write(new RawResponse(patches, ResponseType.Config))
	}
}

/**
 * Enum representing different types of responses
 */
export enum ResponseType {
	Output = 'output',
	State = 'state',
	KeepAlive = 'keepAlive',
	Config = 'config',
	ScanUnit = 'scanUnit'
}

/**
 * RawResponse is the response that sdk sends out as command output
 */
export class RawResponse {
    type: ResponseType
	data: string

    constructor(data: any, type = ResponseType.Output) {
       this.data = data
		this.type = type
	}
}

/**
 * Enum PatchOp is the config patch operations
 */
export enum PatchOp {
	Add = 'add',
	Replace = 'replace',
	Remove = 'remove'
}

/**
 * Patch is a JSON patch for source config
 */
export type Patch = { op: PatchOp, path: string, value?: any }

/**
 * Response implementation which transforms output from I to O.
 */
export class ResponseStreamTransform<I, O> implements Response<I> {
	protected readonly _inner: Response<O>
	protected readonly _transform: (v: I) => O

	constructor(inner: Response<O>, transform: (v: I) => O) {
		this._inner = inner;
		this._transform = transform;
	}

	/**
	 * Send command output
	 * @param chunk output chunk
	 */
	send(chunk: I): void {
		this._inner.send(this._transform(chunk));
	}

	/**
	 * Save state for stateful command
	 * @param state the end state of running the stateful command
	 */
	saveState(state: any): void {
		this._inner.saveState(state);
	}

	/**
	 * Indicates that the commands is still running.
	 *
	 * Can be used to avoid a timeout error in the case when a command
	 * is unable to return responses in a timely manner but is still
	 * actively processing the command.
	 */
	keepAlive(): void {
		this._inner.keepAlive();
	}

	patchConfig(patches: Patch[]): void {
		this._inner.patchConfig(patches);
	}
}

/** How often a scan waiting for the in-flight bytes to drop below the cap re-checks the stream. */
const IN_FLIGHT_POLL_MS = 5
/** How often a scan waiting for 'drain' re-checks that the stream was not destroyed without an event. */
const DRAIN_RECHECK_MS = 50

export type ScanResponseOptions = {
	maxUnitBytes?: number
	maxBlobBytes?: number
	maxInFlightBytes?: number
}

/**
 * Response for std:secret-scan:* commands. Content goes only through `scan()`, which hands it to the runtime's
 * detection stage; only findings leave the execution. There is deliberately no `send()`.
 *
 * `scan()` must be awaited: it resolves once the unit is taken by the response stream, which is how backpressure
 * reaches the connector's fetch loop when detection is slower than fetching. The cap on bytes in flight is
 * approximate: it counts frames still buffered in the stream, not bytes the runtime has yet to scan. A frame larger than
 * the cap is written alone, once nothing else is in flight.
 *
 * The ScanResponse must be the only writer of its stream while the command runs; it tracks what it wrote by the
 * stream's buffered-object count.
 */
export class ScanResponse {
	private readonly _writable: Writable
	private readonly _maxUnitBytes: number
	private readonly _overlapBytes: number
	private readonly _maxInFlightBytes: number
	private readonly _maxBlobBytes: number
	private _pending = false
	// Sizes of the frames written and not yet taken by the stream, oldest first. The stream's own buffered-object count
	// (writableLength) says how many of them are still waiting; it does not depend on write callbacks, which some
	// streams (for example shim-js's response transform) do not pass on.
	private _sizes: number[] = []
	private _failure?: Error
	private _waiters: Array<() => void> = []
	private readonly _onClose = () => this._fail(new Error('response stream closed'))
	private readonly _onFinish = () => this._fail(new Error('response stream ended'))
	private readonly _onError = (err: Error) => this._fail(err)

	constructor(writable: Writable, options: ScanResponseOptions = {}) {
		this._writable = writable
		const requested = Number(options.maxUnitBytes) || MAX_SCAN_UNIT_BYTES
		this._maxUnitBytes = Math.min(MAX_SCAN_UNIT_BYTES, Math.max(MIN_SCAN_UNIT_BYTES, Math.floor(requested)))
		this._overlapBytes = Math.min(SCAN_CHUNK_OVERLAP_BYTES, Math.floor(this._maxUnitBytes / 4))
		this._maxInFlightBytes = Math.max(this._maxUnitBytes, Number(options.maxInFlightBytes) || DEFAULT_MAX_IN_FLIGHT_SCAN_BYTES)
		const requestedBlob = Number(options.maxBlobBytes) || DEFAULT_MAX_SCAN_BLOB_BYTES
		this._maxBlobBytes = Math.min(MAX_SCAN_BLOB_BYTES, Math.max(1, Math.floor(requestedBlob)))

		this._writable.on('close', this._onClose)
		this._writable.on('finish', this._onFinish)
		this._writable.on('error', this._onError)
	}

	/**
	 * Hand one unit of content to the detection stage. Text larger than `maxUnitBytes` is split into overlapping
	 * chunks. A binary (base64) unit is sent whole as one frame, for the runtime to extract; one larger than
	 * `maxBlobBytes` once decoded is not sent. The result says so, and the connector should count it as skipped.
	 */
	async scan(unit: ScanUnit): Promise<ScanResult> {
		if (this._pending) {
			throw new Error('res.scan() was called while a previous call is still pending: await every res.scan() call')
		}
		this._pending = true
		try {
			return await this._scan(unit)
		} finally {
			this._pending = false
		}
	}

	/**
	 * Save the cursor state. The runtime forwards it only after every unit sent before it is scanned.
	 */
	saveState(state: any): void {
		this._writeNow(new RawResponse(state, ResponseType.State))
	}

	keepAlive(): void {
		this._writeNow(new RawResponse({}, ResponseType.KeepAlive))
	}

	patchConfig(patches: Patch[]): void {
		this._writeNow(new RawResponse(patches, ResponseType.Config))
	}

	/**
	 * Stop listening to the stream. Called by the SDK when the command handler returns.
	 */
	dispose(): void {
		this._writable.off('close', this._onClose)
		this._writable.off('finish', this._onFinish)
		this._writable.off('error', this._onError)
		this._wake()
	}

	private async _scan(unit: ScanUnit): Promise<ScanResult> {
		validateScanUnit(unit)
		this._throwIfFailed()

		const { encoding, text } = unit.content
		// Binary content cannot be split at arbitrary byte offsets, so it is one frame, sized by its decoded bytes.
		let chunks: Array<{ text: string; offset: number; sizeBytes: number }>
		if (encoding === 'base64') {
			const sizeBytes = Buffer.byteLength(text, 'base64')
			if (sizeBytes > this._maxBlobBytes) {
				return { accepted: false, chunks: 0, skipped: 'oversize' }
			}
			chunks = [{ text, offset: 0, sizeBytes }]
		} else {
			chunks = chunkUtf8(text, this._maxUnitBytes, this._overlapBytes).map((chunk) => ({
				...chunk,
				sizeBytes: Buffer.byteLength(chunk.text, 'utf8'),
			}))
		}

		for (let index = 0; index < chunks.length; index++) {
			const chunk = chunks[index]
			// Built field by field: anything else the connector put on the unit is not sent.
			const data: ScanUnitFrame = {
				unitId: unit.unitId,
				location: unit.location,
				mimeType: unit.mimeType,
				// The size of this frame's content, not of the whole unit.
				sizeBytes: chunk.sizeBytes,
				content: { encoding, text: chunk.text },
				chunk: {
					index,
					count: chunks.length,
					overlapBytes: chunks.length > 1 ? this._overlapBytes : 0,
					offset: chunk.offset,
				},
			}
			await this._write(new RawResponse(data, ResponseType.ScanUnit), Buffer.byteLength(chunk.text, 'utf8'))
		}
		return { accepted: true, chunks: chunks.length }
	}

	private _writeNow(frame: RawResponse): boolean {
		this._throwIfFailed()
		this._sizes.push(0)
		return this._writable.write(frame)
	}

	private async _write(frame: RawResponse, bytes: number): Promise<void> {
		this._throwIfFailed()
		// A frame larger than the cap could never fit beside others: it goes alone, once nothing else is in flight.
		while (bytes > this._maxInFlightBytes && !this._failed() && this._inFlightBytes() > 0) {
			await this._waitFor('poll')
		}
		this._throwIfFailed()
		this._sizes.push(bytes)
		const accepted = this._writable.write(frame)
		if (!accepted) {
			await this._waitForDrain()
		}
		while (!this._failed() && this._inFlightBytes() > this._maxInFlightBytes) {
			await this._waitFor('poll')
		}
		this._throwIfFailed()
	}

	/** Bytes of scan content written and still buffered in the stream. */
	private _inFlightBytes(): number {
		const length = this._writable.writableLength
		// A stream without a buffered-object count gets no byte cap; write()'s return value and 'drain' still apply.
		const buffered = Number.isFinite(length) ? length : 0
		if (this._sizes.length > buffered) {
			this._sizes.splice(0, this._sizes.length - buffered)
		}
		return this._sizes.reduce((total, size) => total + size, 0)
	}

	/**
	 * Waits until the stream drained or failed. Where the stream reports writableNeedDrain, the wait re-checks it
	 * periodically, so a stream destroyed without a 'close' event (emitClose: false) does not leave the scan waiting.
	 */
	private async _waitForDrain(): Promise<void> {
		const needDrain = () => (this._writable as Writable & { writableNeedDrain?: boolean }).writableNeedDrain
		if (needDrain() === undefined) {
			await this._waitFor('drain')
			return
		}
		while (!this._failed() && needDrain()) {
			await this._waitFor('drain', DRAIN_RECHECK_MS)
		}
	}

	/** Resolves on drain (or after a short poll), or as soon as the stream fails. */
	private _waitFor(event: 'drain' | 'poll', recheckMs?: number): Promise<void> {
		if (this._failed()) {
			return Promise.resolve()
		}
		return new Promise<void>((resolve) => {
			let timer: NodeJS.Timeout | undefined
			const done = () => {
				this._writable.off('drain', done)
				if (timer) {
					clearTimeout(timer)
				}
				this._waiters = this._waiters.filter((w) => w !== done)
				resolve()
			}
			if (event === 'drain') {
				this._writable.once('drain', done)
				if (recheckMs) {
					timer = setTimeout(done, recheckMs)
				}
			} else {
				timer = setTimeout(done, IN_FLIGHT_POLL_MS)
			}
			this._waiters.push(done)
		})
	}

	/** Whether the stream can no longer take frames. A destroy without 'close' (emitClose: false) is caught here. */
	private _failed(): boolean {
		if (!this._failure && (this._writable.destroyed || this._writable.writableEnded)) {
			// errored (Node 18+) is the error the stream was destroyed with; it is not in this package's Node typings.
			const errored = (this._writable as Writable & { errored?: Error | null }).errored
			this._failure = errored ?? new Error(this._writable.destroyed ? 'response stream closed' : 'response stream ended')
		}
		return this._failure !== undefined
	}

	private _fail(err: Error): void {
		if (!this._failure) {
			this._failure = err
		}
		this._wake()
	}

	private _wake(): void {
		for (const waiter of [...this._waiters]) {
			waiter()
		}
	}

	private _throwIfFailed(): void {
		if (this._failed()) {
			throw this._failure
		}
	}
}

function validateScanUnit(unit: ScanUnit): void {
	if (!unit || typeof unit.unitId !== 'string' || unit.unitId === '') {
		throw new TypeError('scan unit requires a unitId')
	}
	if (!unit.location || typeof unit.location.scanTarget !== 'string' || unit.location.scanTarget === '') {
		throw new TypeError(`scan unit ${unit.unitId} requires location.scanTarget`)
	}
	if (!unit.content || typeof unit.content.text !== 'string') {
		throw new TypeError(`scan unit ${unit.unitId} requires content.text`)
	}
	if (unit.content.encoding !== 'utf8' && unit.content.encoding !== 'base64') {
		throw new TypeError(`scan unit ${unit.unitId} has unsupported encoding ${unit.content.encoding}`)
	}
}
