/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Writable } from 'stream'
import type {
	ScanContentKind,
	ScanExtraction,
	ScanFile,
	ScanResult,
	ScanUnit,
	ScanUnitFrame,
} from '../commands/std-secret-scan'
import { logger } from '../logger'
import { allowFile, scanBlobLimit } from '../scan-file-policy'
import {
	chunkUtf8,
	countUtf8Chunks,
	DEFAULT_MAX_IN_FLIGHT_SCAN_BYTES,
	MAX_SCAN_UNIT_BYTES,
	MIN_SCAN_UNIT_BYTES,
	SCAN_CHUNK_OVERLAP_BYTES,
} from './scan-chunk'
import { boundLocation } from './scan-location'

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
	/** The command's `extraction`; `scanFile()` applies it, and no file is sent when `files` is `false`. */
	extraction?: ScanExtraction
}

/**
 * Response for std:secret-scan:* commands. Content goes only through `scan()` and `scanFile()`, which hand it to the
 * runtime's detection stage; only findings leave the execution. There is deliberately no `send()`.
 *
 * `scan()` and `scanFile()` must be awaited: they resolve once the unit is taken by the response stream, which is how
 * backpressure reaches the connector's fetch loop when detection is slower than fetching. The cap on bytes in flight
 * is approximate: it counts the bytes of frames still buffered in the stream, not bytes the runtime has yet to scan. A
 * frame larger than the cap is written alone, once nothing else is in flight.
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
	private readonly _extraction?: ScanExtraction
	private _pending = false
	// Sizes of the frames written and not yet taken by the stream, oldest first, and their sum. The stream's own
	// buffered-object count (writableLength) says how many of them are still waiting; it does not depend on write
	// callbacks, which some streams (for example a response transform that overrides write()) do not pass on.
	private _sizes: number[] = []
	private _sizesTotal = 0
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
		this._maxBlobBytes = scanBlobLimit(options.maxBlobBytes)
		this._extraction = options.extraction

		this._writable.on('close', this._onClose)
		this._writable.on('finish', this._onFinish)
		this._writable.on('error', this._onError)
	}

	/** The largest file sent, in bytes: the command's `maxBlobBytes`, within 1 byte and 11 MiB. */
	get maxBlobBytes(): number {
		return this._maxBlobBytes
	}

	/**
	 * Hand one unit of content to the detection stage. Text larger than `maxUnitBytes` is split into overlapping
	 * chunks. A binary (base64) unit is sent whole as one frame, for the runtime to extract; one larger than
	 * `maxBlobBytes` once decoded is not sent. A file unit (base64, or `content.kind` `file`) is not sent when the
	 * command's `extraction.files` is `false`. The result says so, and the connector should count it as skipped.
	 *
	 * For a file, prefer `scanFile()`: it applies the whole file policy and takes the bytes as they are.
	 */
	async scan(unit: ScanUnit): Promise<ScanResult> {
		return this._exclusive(() => this._scan(unit))
	}

	/**
	 * Hand one file to the detection stage, as its raw bytes; the runtime detects the format and extracts the text.
	 * The file policy (`allowFile`) is applied to the file's name, content type and byte length first, and a file it
	 * refuses is not sent: the result carries the reason (`unlicensed`, `policySkipped`, `pdfDisabled`, `ocrDisabled`
	 * or `oversize`) for the connector to count. Call `allowFile` before downloading as well, so refused files are
	 * never fetched.
	 *
	 * The bytes are base64-encoded straight from the given buffer, without another copy, and sent as one frame.
	 */
	async scanFile(file: ScanFile, bytes: Buffer | Uint8Array): Promise<ScanResult> {
		return this._exclusive(() => this._scanFile(file, bytes))
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

	private async _exclusive(run: () => Promise<ScanResult>): Promise<ScanResult> {
		if (this._pending) {
			throw new Error('res.scan() was called while a previous call is still pending: await every res.scan() call')
		}
		this._pending = true
		try {
			return await run()
		} finally {
			this._pending = false
		}
	}

	private async _scan(unit: ScanUnit): Promise<ScanResult> {
		const kind = validateScanUnit(unit)
		this._throwIfFailed()

		const { encoding, text } = unit.content
		if (kind === 'file' && this._extraction?.files === false) {
			logger.debug('scan(): a file unit was not sent: extraction.files is false')
			return { accepted: false, chunks: 0, skipped: 'unlicensed' }
		}
		const location = boundLocation(unit.location)

		// Binary content cannot be split at arbitrary byte offsets, so it is one frame, sized by its decoded bytes.
		if (encoding === 'base64') {
			const sizeBytes = Buffer.byteLength(text, 'base64')
			if (sizeBytes > this._maxBlobBytes) {
				// Sizes only: the unit's content and location are the connector's data.
				logger.debug(
					`scan(): a binary unit of ${sizeBytes} bytes is over maxBlobBytes ${this._maxBlobBytes}; not sent`
				)
				return { accepted: false, chunks: 0, skipped: 'oversize' }
			}
			await this._writeUnit(unit, location, kind, { text, offset: 0, sizeBytes }, 0, 1, text.length)
			return { accepted: true, chunks: 1 }
		}

		// Chunks are produced one at a time; only the count is computed up front, without building them.
		const count = countUtf8Chunks(text, this._maxUnitBytes, this._overlapBytes)
		let index = 0
		for (const chunk of chunkUtf8(text, this._maxUnitBytes, this._overlapBytes)) {
			await this._writeUnit(unit, location, kind, chunk, index++, count, chunk.sizeBytes)
		}
		return { accepted: true, chunks: count }
	}

	private async _scanFile(file: ScanFile, bytes: Buffer | Uint8Array): Promise<ScanResult> {
		validateScanFile(file, bytes)
		this._throwIfFailed()

		const mimeType = file.mimeType || 'application/octet-stream'
		const decision = allowFile(file.name, mimeType, bytes.byteLength, this._extraction, this._maxBlobBytes)
		if (!decision.allow) {
			// The reason and the size only: the file's name and location are the connector's data.
			logger.debug(`scanFile(): a file of ${bytes.byteLength} bytes was not sent: ${decision.reason}`)
			return { accepted: false, chunks: 0, skipped: decision.reason }
		}
		// A view of the same memory, not a copy; base64 is then the only copy of the content the frame needs.
		const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
		const text = buffer.toString('base64')
		const unit: ScanUnit = {
			unitId: file.unitId,
			location: file.location,
			content: { encoding: 'base64', text },
			mimeType,
		}
		const chunk = { text, offset: 0, sizeBytes: bytes.byteLength }
		await this._writeUnit(unit, boundLocation(file.location), 'file', chunk, 0, 1, text.length)
		return { accepted: true, chunks: 1 }
	}

	/** Writes one frame of a unit, built field by field: anything else the connector put on the unit is not sent. */
	private async _writeUnit(
		unit: ScanUnit,
		location: ScanUnitFrame['location'],
		kind: ScanContentKind,
		chunk: { text: string; offset: number; sizeBytes: number },
		index: number,
		count: number,
		wireBytes: number
	): Promise<void> {
		const data: ScanUnitFrame = {
			unitId: unit.unitId,
			location,
			mimeType: unit.mimeType,
			// The size of this frame's content, not of the whole unit.
			sizeBytes: chunk.sizeBytes,
			content: { encoding: unit.content.encoding, kind, text: chunk.text },
			chunk: {
				index,
				count,
				overlapBytes: count > 1 ? this._overlapBytes : 0,
				offset: chunk.offset,
			},
		}
		await this._write(new RawResponse(data, ResponseType.ScanUnit), wireBytes)
	}

	private _writeNow(frame: RawResponse): boolean {
		this._throwIfFailed()
		this._sizes.push(0)
		return this._writable.write(frame)
	}

	private async _write(frame: RawResponse, bytes: number): Promise<void> {
		this._throwIfFailed()
		// A frame larger than the cap could never fit beside others: it goes alone, once nothing else is in flight.
		const waitStarted = Date.now()
		let waited = false
		while (bytes > this._maxInFlightBytes && !this._failed() && this._inFlightBytes() > 0) {
			waited = true
			await this._waitFor('poll')
		}
		if (waited) {
			logger.debug(`scan(): a ${bytes}-byte frame waited ${Date.now() - waitStarted} ms to be written alone`)
		}
		this._throwIfFailed()
		this._sizes.push(bytes)
		this._sizesTotal += bytes
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
			for (const size of this._sizes.splice(0, this._sizes.length - buffered)) {
				this._sizesTotal -= size
			}
		}
		return this._sizesTotal
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
			// errored is the error the stream was destroyed with; it is not in this package's Node typings. Node 16 has
			// no public getter, only the internal _writableState.errored, which the release workflow's Node 16 needs.
			const w = this._writable as Writable & { errored?: Error | null; _writableState?: { errored?: Error | null } }
			const errored = w.errored ?? w._writableState?.errored
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

// Validation errors name the field at fault, never the unit id or location: those identify the connector's data.

function validateScanUnit(unit: ScanUnit): ScanContentKind {
	if (!unit || typeof unit.unitId !== 'string' || unit.unitId === '') {
		throw new TypeError('scan unit requires a unitId')
	}
	validateLocation(unit.location)
	if (!unit.content || typeof unit.content.text !== 'string') {
		throw new TypeError('scan unit requires content.text')
	}
	const { encoding, kind } = unit.content
	if (encoding !== 'utf8' && encoding !== 'base64') {
		throw new TypeError(`scan unit has unsupported encoding ${String(encoding).slice(0, 32)}`)
	}
	if (kind !== undefined && kind !== 'text' && kind !== 'file') {
		throw new TypeError(`scan unit has unsupported content.kind ${String(kind).slice(0, 32)}`)
	}
	if (encoding === 'base64' && kind === 'text') {
		throw new TypeError("a base64 scan unit is a file: content.kind must be 'file' or absent")
	}
	return kind ?? (encoding === 'base64' ? 'file' : 'text')
}

function validateScanFile(file: ScanFile, bytes: Buffer | Uint8Array): void {
	if (!file || typeof file.unitId !== 'string' || file.unitId === '') {
		throw new TypeError('scan file requires a unitId')
	}
	validateLocation(file.location)
	if (typeof file.name !== 'string') {
		throw new TypeError('scan file requires a name')
	}
	if (!(bytes instanceof Uint8Array)) {
		throw new TypeError('scanFile() takes the file as a Buffer or Uint8Array')
	}
}

function validateLocation(location: ScanUnit['location']): void {
	if (!location || typeof location.scanTarget !== 'string' || location.scanTarget === '') {
		throw new TypeError('scan unit requires location.scanTarget')
	}
}
