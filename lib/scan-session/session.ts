/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import type { ScanFile, ScanResult, ScanUnit, StdSecretScanDeltaInput } from '../commands/std-secret-scan'
import { logger } from '../logger'
import type { ScanResponse } from '../response'
import { allowFile } from '../scan-file-policy'
import {
	boundState,
	DEFAULT_MAX_SEEN_PER_TARGET,
	DEFAULT_SCAN_OVERLAP_MS,
	isUnchanged,
	MAX_SCAN_STATE_BYTES,
	nextTargetState,
	ScanCoverage,
	scanLogRef,
	ScanState,
	scanStateProblem,
	ScanStatePosition,
	ScanTargetState,
	ScanVisited,
	SCAN_STATE_VERSION,
	seenValue,
	startPosition,
} from './state'

/** A file of an item: what `ScanResponse.scanFile()` needs, plus the connector's reference to fetch it by. */
export type ScanSessionFile = ScanFile & {
	/** The connector's own reference to the file (an id or a download link), handed back to `fetchFile`. */
	ref: string
	/** The size the source reports, if it does, so an oversize file is never downloaded. */
	sizeBytes?: number
}

/**
 * One item of a target's enumeration: a record, page, message or file in the source. `enumerate` yields items in
 * ascending `modifiedAt` order (ties in any stable order), and the session saves the newest `modifiedAt` handled as
 * the target's cursor.
 */
export type ScanSessionItem<P = unknown> = {
	id: string
	/** When the item last changed, as an ISO 8601 instant, always in the same format for a target. */
	modifiedAt: string
	/**
	 * The item's change counter, if the source has one (a revision or modification count). With it, an item edited
	 * twice within the same second is still scanned again.
	 */
	version?: string | number
	/** Text units of the item. A generator is only run when the item is scanned, not when it is skipped. */
	units?: Iterable<ScanUnit> | AsyncIterable<ScanUnit>
	/** Files of the item, checked with `allowFile` before `fetchFile` is called. */
	files?: Iterable<ScanSessionFile>
	/** Connector data saved as the target's `payload` once this item is handled. */
	payload?: P
}

/** A target, or one sub-target of a target with sub-targets. */
export type ScanTargetRef = { id: string; child?: string }

/** File bytes from `fetchFile`: a buffer, or a stream of chunks (read up to the size limit). */
export type ScanFileBytes = Buffer | Uint8Array | AsyncIterable<Uint8Array | string>

/** What a connector supplies to a `ScanSession`: enumeration, and fetching files. */
export interface ScanSource<P = unknown> {
	/**
	 * The items of a target, in ascending `modifiedAt` order. `since` (ISO) is an inclusive lower bound on
	 * `modifiedAt`; `resumeAfter` is the item to resume right after, in the same order. With neither, enumerate
	 * everything. Throw when the target cannot be enumerated: a full scan must not complete while skipping scope.
	 * Throw `ScanTargetUnavailableError` for a sub-target that cannot be read right now: a delta keeps its state and
	 * moves on, and a full scan fails.
	 */
	enumerate(
		target: ScanTargetRef,
		since: string | undefined,
		resumeAfter: ScanStatePosition | undefined,
		payload: P | undefined
	): AsyncIterable<ScanSessionItem<P>>
	/**
	 * Downloads a file the policy allows. Resolve undefined when it cannot be downloaded for a reason that may pass (it
	 * was deleted since it was listed, or access was refused): it is counted as `unavailable`, and a full scan keeps
	 * the target's earlier findings. Throw for anything else. maxBytes is the size limit; a stream is read up to it.
	 */
	fetchFile?(file: ScanSessionFile, maxBytes: number): Promise<ScanFileBytes | undefined>
}

/** A target to scan. With `children`, its content is split into sub-targets listed at run time, each with its own cursor. */
export type ScanSessionTarget = { id: string; children?: () => Promise<string[]> }

/** A sub-target that cannot be read right now (for example its schema is not readable). See `ScanSource.enumerate`. */
export class ScanTargetUnavailableError extends Error {
	constructor(message = 'scan target unavailable') {
		super(message)
		this.name = 'ScanTargetUnavailableError'
	}
}

export type ScanSessionOptions = {
	mode: 'full' | 'delta'
	input: Partial<StdSecretScanDeltaInput>
	res: ScanResponse
	/**
	 * Every target the connector declares. State of other targets is dropped, and a full scan must be given all of
	 * them, since its state replaces everything saved before.
	 */
	declaredTargets?: string[]
	/** How far before its cursor a delta re-reads a target. Default 5 minutes. */
	overlapMs?: number
	/** The most `seen` entries kept per target. Default 1000. */
	maxSeenPerTarget?: number
	/** The serialised state is kept under this size by dropping the oldest `seen` entries. Default 256 KiB. */
	maxStateBytes?: number
	/** Items between checkpoints of the state within a target. Default 1000. */
	checkpointEvery?: number
	/** Interval of keep-alive frames, in ms. Default 30 s; 0 sends none. */
	keepAliveMs?: number
	/** A delta budget besides `maxUnits` (for example a deadline), checked between items. */
	shouldStop?: () => boolean
	now?: () => Date
}

// Skips after which a full scan has not seen everything it should have: their target's earlier findings are retained.
const RETAINED_REASONS = new Set(['pdfDisabled', 'ocrDisabled', 'unavailable', 'notAccepted'])

/**
 * Runs a secret scan over a connector's targets and keeps its state: the `v: 1` envelope, a cursor per target (the
 * newest modified time handled) re-read less an overlap, the `seen` window of items already scanned in that overlap,
 * resuming after a budget stop, the state size budget, coverage counts and the retained scope of a full scan. The
 * connector supplies only enumeration and file downloads (`ScanSource`).
 *
 * A full scan either enumerates every target completely or throws: a partial snapshot would make the platform delete
 * findings that were never reached. A delta with `maxUnits` (or `shouldStop`) stops at the first item boundary after
 * the budget, so an item is never half scanned, and the next delta resumes the target that stopped right after its
 * last item, then continues with the targets after it, so a large target cannot starve the others.
 */
export class ScanSession<P = unknown> {
	private readonly mode: 'full' | 'delta'
	private readonly input: Partial<StdSecretScanDeltaInput>
	private readonly res: ScanResponse
	private readonly overlapMs: number
	private readonly maxSeenPerTarget: number
	private readonly maxStateBytes: number
	private readonly checkpointEvery: number
	private readonly coverage: ScanCoverage = { unitsScanned: 0, unitsChunked: 0, skipped: {} }
	private readonly retained = new Set<string>()
	private targets: Record<string, ScanTargetState<P>> = {}
	private resumeTarget?: string
	private units = 0
	private stopped = false
	private startedAt = ''

	constructor(private readonly options: ScanSessionOptions) {
		this.mode = options.mode
		this.input = options.input ?? {}
		this.res = options.res
		this.overlapMs = options.overlapMs ?? DEFAULT_SCAN_OVERLAP_MS
		this.maxSeenPerTarget = options.maxSeenPerTarget ?? DEFAULT_MAX_SEEN_PER_TARGET
		this.maxStateBytes = options.maxStateBytes ?? MAX_SCAN_STATE_BYTES
		this.checkpointEvery = Math.max(1, Math.floor(options.checkpointEvery ?? 1000))
		const maxUnits = this.input.maxUnits
		if (maxUnits != null && (!Number.isInteger(maxUnits) || maxUnits < 1)) {
			throw new RangeError(`maxUnits must be a positive integer, got ${maxUnits}`)
		}
	}

	/** Coverage so far. */
	get counts(): ScanCoverage {
		return JSON.parse(JSON.stringify(this.coverage))
	}

	/**
	 * Marks a target whose earlier findings a full scan must keep, because it could not cover the target completely.
	 * The session does this itself for files it could not scan; a connector calls it for anything else it skipped.
	 */
	retain(targetId: string): void {
		if (this.mode === 'full') {
			this.retained.add(targetId)
		}
	}

	/** Counts a unit or file the connector skipped itself, under its reason. */
	skip(reason: string, targetId?: string): void {
		this.coverage.skipped[reason] = (this.coverage.skipped[reason] ?? 0) + 1
		if (targetId !== undefined && RETAINED_REASONS.has(reason)) {
			this.retain(targetId)
		}
	}

	/** Scans the targets in order and returns the state it saved last. */
	async run(targets: ScanSessionTarget[], source: ScanSource<P>): Promise<ScanState<P>> {
		const previous = this.previousState()
		this.checkTargets(targets)
		this.startedAt = (this.options.now?.() ?? new Date()).toISOString()
		this.targets = this.keptTargets(previous?.targets ?? {})
		const ordered = rotate(targets, previous?.resumeTarget, (t) => t.id)
		const unitsPerTarget: Record<string, number> = {}

		logger.info(`Secret scan (${this.mode}) started for ${ordered.length} targets`)
		const keepAliveMs = this.options.keepAliveMs ?? 30000
		this.res.keepAlive()
		const keepAlive =
			keepAliveMs > 0
				? setInterval(() => {
						try {
							this.res.keepAlive()
						} catch (error: any) {
							// The response stream is gone; the scan itself fails on its next scan().
							logger.warn(`Secret scan keep-alive failed: ${error?.name ?? 'error'}`)
							clearInterval(keepAlive!)
						}
				  }, keepAliveMs)
				: undefined

		try {
			for (const target of ordered) {
				const unitsBefore = this.coverage.unitsScanned
				if (target.children) {
					await this.scanParent(target, previous?.targets[target.id], source)
				} else {
					await this.scanTarget({ id: target.id }, previous?.targets[target.id], source, (state) => {
						this.targets[target.id] = state
					})
				}
				unitsPerTarget[target.id] = this.coverage.unitsScanned - unitsBefore
				if (this.stopped) {
					this.resumeTarget = target.id
					logger.info(`Secret scan stopped at its budget in target ${target.id}`)
					break
				}
			}
			const state = this.save()
			logger.info(
				`Secret scan (${this.mode}) completed: ${JSON.stringify({ ...this.coverage, targets: unitsPerTarget })}`
			)
			return state
		} finally {
			if (keepAlive) {
				clearInterval(keepAlive)
			}
		}
	}

	private previousState(): Pick<ScanState<P>, 'targets' | 'resumeTarget'> | undefined {
		// A full scan starts over: the platform loads no state for it.
		if (this.mode === 'full' || this.input.state == null) {
			return undefined
		}
		const problem = scanStateProblem(this.input.state)
		if (problem) {
			throw new Error(`Invalid secret scan state: ${problem}`)
		}
		const state = this.input.state as Partial<ScanState<P>>
		return { targets: state.targets ?? {}, resumeTarget: state.resumeTarget }
	}

	private checkTargets(targets: ScanSessionTarget[]): void {
		const ids = targets.map((t) => t.id)
		if (new Set(ids).size !== ids.length) {
			throw new Error('Each secret scan target must be listed once')
		}
		const declared = this.options.declaredTargets
		if (!declared) {
			return
		}
		const unknown = ids.filter((id) => !declared.includes(id))
		if (unknown.length > 0) {
			throw new Error(`Unknown secret scan targets: ${unknown.join(',')}`)
		}
		// A scan without saved state saves state with only the targets it scanned, so a subset would drop the other
		// targets' cursors.
		if (this.mode === 'full' || this.input.state == null) {
			const missing = declared.filter((id) => !ids.includes(id))
			if (missing.length > 0) {
				throw new Error(
					`A secret scan without saved state must scan every declared target; missing: ${missing.join(',')}`
				)
			}
		}
	}

	/** The previous targets' state, without targets the connector no longer declares. */
	private keptTargets(previous: Record<string, ScanTargetState<P>>): Record<string, ScanTargetState<P>> {
		const declared = this.options.declaredTargets
		return Object.fromEntries(Object.entries(previous).filter(([id]) => !declared || declared.includes(id)))
	}

	private async scanParent(
		target: ScanSessionTarget,
		previous: ScanTargetState<P> | undefined,
		source: ScanSource<P>
	): Promise<void> {
		let names: string[]
		try {
			names = [...new Set(await target.children!())]
		} catch (error) {
			if (this.mode === 'full') {
				throw error
			}
			// Nothing is lost: the sub-targets keep their cursors and the next delta tries again.
			logger.warn(`Secret scan could not list the sub-targets of ${target.id}; keeping their state`)
			return
		}
		const previousChildren = this.mode === 'full' ? {} : previous?.targets ?? {}
		// Only sub-targets that still exist keep their state.
		const children: Record<string, ScanTargetState<P>> = {}
		for (const name of names) {
			if (previousChildren[name]) {
				children[name] = previousChildren[name]
			}
		}
		const commit = () => {
			this.targets[target.id] = { targets: children }
		}
		commit()
		const resumeChild = names.find((name) => previousChildren[name]?.resumeAfter)
		logger.info(`Secret scan target ${target.id}: ${names.length} sub-targets`)
		for (const name of rotate(names, resumeChild, (n) => n)) {
			try {
				await this.scanTarget({ id: target.id, child: name }, previousChildren[name], source, (state) => {
					children[name] = state
					commit()
				})
			} catch (error) {
				if (!(error instanceof ScanTargetUnavailableError) || this.mode === 'full') {
					throw error
				}
				logger.warn(`Secret scan target ${target.id}/${scanLogRef(name)} is unavailable; keeping its state`)
			}
			if (this.stopped) {
				break
			}
		}
		commit()
	}

	private async scanTarget(
		ref: ScanTargetRef,
		previous: ScanTargetState<P> | undefined,
		source: ScanSource<P>,
		commit: (state: ScanTargetState<P>) => void
	): Promise<void> {
		const label = ref.child === undefined ? ref.id : `${ref.id}/${scanLogRef(ref.child)}`
		const start = startPosition(this.mode, previous, {
			overlapMs: this.overlapMs,
			lookbackDays: this.input.lookbackDays,
			now: () => this.options.now?.() ?? new Date(),
		})
		const fromStart = !start.since && !start.resumeAfter
		const visited = new ScanVisited(this.overlapMs, this.maxSeenPerTarget)
		let last: ScanStatePosition | undefined
		let payload: P | undefined
		let items = 0
		let unchanged = 0
		const state = (completed: boolean) =>
			nextTargetState(
				this.mode,
				previous,
				{
					last,
					payload,
					visited: visited.entries(),
					completed,
					fromStart,
					stopped: this.stopped,
					startedAt: this.startedAt,
				},
				{ overlapMs: this.overlapMs, maxSeenPerTarget: this.maxSeenPerTarget }
			)

		if (this.mode === 'delta') {
			const from = start.resumeAfter
				? 'resuming where the last delta stopped'
				: start.since
				? `since ${start.since}`
				: 'from the beginning'
			logger.info(`Secret scan target ${label}: ${from}`)
		}
		if (this.atBudget()) {
			this.stopped = true
			commit(state(false))
			return
		}

		for await (const item of source.enumerate(ref, start.since, start.resumeAfter, previous?.payload)) {
			checkItem(item, last)
			// The budget is checked between items, so an item is never half scanned and the position stays exact.
			if (this.atBudget()) {
				this.stopped = true
				break
			}
			if (this.mode === 'delta' && isUnchanged(previous, item.id, item.modifiedAt, item.version)) {
				unchanged++
			} else {
				await this.scanItem(ref.id, item, source)
			}
			visited.add(item.id, item.modifiedAt, seenValue(item.modifiedAt, item.version))
			last = { cursor: item.modifiedAt, id: item.id }
			if (item.payload !== undefined) {
				payload = item.payload
			}
			if (++items % this.checkpointEvery === 0) {
				commit(state(false))
				this.save()
			}
		}
		commit(state(!this.stopped))
		this.save()
		if (unchanged > 0) {
			logger.debug(
				`Target ${label}: ${unchanged} items in the overlap window were already scanned and are unchanged; skipped`
			)
		}
	}

	private async scanItem(targetId: string, item: ScanSessionItem<P>, source: ScanSource<P>): Promise<void> {
		for await (const unit of item.units ?? []) {
			this.count(targetId, await this.res.scan(unit))
		}
		for (const file of item.files ?? []) {
			await this.scanFile(targetId, file, source)
		}
	}

	private async scanFile(targetId: string, file: ScanSessionFile, source: ScanSource<P>): Promise<void> {
		const maxBytes = this.res.maxBlobBytes
		const decision = allowFile(file.name, file.mimeType, file.sizeBytes, this.input.extraction, maxBytes)
		if (!decision.allow) {
			this.skip(decision.reason, targetId)
			return
		}
		if (!source.fetchFile) {
			throw new Error('An item has files, but the scan source has no fetchFile()')
		}
		const fetched = await source.fetchFile(file, maxBytes)
		if (fetched === undefined) {
			this.skip('unavailable', targetId)
			return
		}
		const bytes = fetched instanceof Uint8Array ? fetched : await readCapped(fetched, maxBytes)
		if (!bytes) {
			this.skip('oversize', targetId)
			return
		}
		this.count(targetId, await this.res.scanFile(file, bytes))
	}

	private count(targetId: string, result: ScanResult): void {
		if (!result.accepted) {
			this.skip(result.skipped ?? 'notAccepted', targetId)
			return
		}
		this.units++
		this.coverage.unitsScanned++
		if (result.chunks > 1) {
			this.coverage.unitsChunked++
		}
	}

	private atBudget(): boolean {
		if (this.mode !== 'delta') {
			return false
		}
		const maxUnits = this.input.maxUnits
		return (Boolean(maxUnits) && this.units >= maxUnits!) || Boolean(this.options.shouldStop?.())
	}

	/**
	 * Saves the state. Only the latest saved state is kept by the runtime and it is forwarded only once every unit sent
	 * before it is scanned, so checkpointing often is cheap and every cursor saved has had all its units accepted.
	 */
	private save(): ScanState<P> {
		const state: ScanState<P> = JSON.parse(
			JSON.stringify({
				v: SCAN_STATE_VERSION,
				targets: this.targets,
				coverage: this.coverage,
				...(this.retained.size > 0 ? { retainedScope: [...this.retained].sort() } : {}),
				...(this.resumeTarget ? { resumeTarget: this.resumeTarget } : {}),
			})
		)
		const { dropped, bytes } = boundState(state as ScanState<unknown>, this.maxStateBytes)
		if (dropped > 0) {
			logger.info(
				`Secret scan state: dropped the ${dropped} oldest seen entries to stay under ${this.maxStateBytes} bytes`
			)
		}
		if (bytes > this.maxStateBytes) {
			logger.warn(`Secret scan state is ${bytes} bytes, over its ${this.maxStateBytes}-byte budget`)
		}
		this.res.saveState(state)
		return state
	}
}

/** Starts with the entry a previous delta stopped in, keeping the order after it. */
const rotate = <T>(list: T[], first: string | undefined, key: (t: T) => string): T[] => {
	const index = first === undefined ? -1 : list.findIndex((t) => key(t) === first)
	return index > 0 ? [...list.slice(index), ...list.slice(0, index)] : list
}

const checkItem = (item: ScanSessionItem<unknown>, last: ScanStatePosition | undefined): void => {
	if (!item || typeof item.id !== 'string' || item.id === '') {
		throw new TypeError('enumerate() yielded an item without an id')
	}
	const at = Date.parse(item.modifiedAt)
	if (typeof item.modifiedAt !== 'string' || Number.isNaN(at)) {
		throw new TypeError('enumerate() yielded an item without a valid modifiedAt')
	}
	// The cursor is the newest modifiedAt handled, so a later item with an earlier time would be lost after a stop.
	if (last && at < Date.parse(last.cursor)) {
		throw new Error('enumerate() must yield items in ascending modifiedAt order')
	}
}

/** Reads a stream up to maxBytes. Returns undefined, after closing the stream, when it is larger. */
const readCapped = async (
	stream: AsyncIterable<Uint8Array | string>,
	maxBytes: number
): Promise<Buffer | undefined> => {
	const chunks: Buffer[] = []
	let total = 0
	for await (const chunk of stream) {
		const buffer =
			typeof chunk === 'string'
				? Buffer.from(chunk)
				: Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)
		total += buffer.length
		if (total > maxBytes) {
			// Leaving the loop closes the iterator, which destroys a Node stream.
			return undefined
		}
		chunks.push(buffer)
	}
	return chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, total)
}
