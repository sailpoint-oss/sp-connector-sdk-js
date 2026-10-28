/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { createHash } from 'crypto'

/**
 * The connector state a secret scan saves (`res.saveState`) and gets back as `input.state` on the next delta. These
 * functions are pure: `ScanSession` uses them, and a connector that drives its own scan loop can use them to keep the
 * same envelope and semantics.
 */

/** Version of the state envelope. A saved state without `v` is read as version 1. */
export const SCAN_STATE_VERSION = 1
/** The serialised state is kept under this many bytes by dropping the oldest `seen` entries first. */
export const MAX_SCAN_STATE_BYTES = 256 * 1024
/** How far before its cursor a delta re-reads a target, to catch items committed late with an earlier time. */
export const DEFAULT_SCAN_OVERLAP_MS = 5 * 60 * 1000
/** The most `seen` entries kept per target. Past it the oldest are dropped, and those items are simply read again. */
export const DEFAULT_MAX_SEEN_PER_TARGET = 1000

/** An item's position in a target's enumeration order: its modified time (ISO 8601) and its id. */
export type ScanStatePosition = { cursor: string; id: string }

/**
 * What the state keeps per scan target (and per sub-target, under `targets`).
 *
 * - `cursor`: the modified time of the newest item handled, as the connector reported it. It never moves back, and it
 *   comes from the items, never from the clock of the machine the scan runs on.
 * - `empty`: the last enumeration from the beginning was complete and found nothing, so the next delta starts from
 *   the beginning again instead of a lookback window.
 * - `resumeAfter`: where a delta stopped by its budget; the next delta resumes right after this item.
 * - `seen`: items already scanned whose modified time lies in the overlap window before `cursor`, as id -> version
 *   (see `seenValue`). A delta re-reads the window and skips these unless they changed.
 * - `lastFullScanAt`: when the last complete full scan of the target started. Informational.
 * - `payload`: the connector's own data for the target (for example a source-side change token), saved with the
 *   cursor of the item that carried it.
 * - `targets`: the state of each sub-target, for a target whose content is split into sub-targets found at run time.
 */
export type ScanTargetState<P = unknown> = {
	cursor?: string
	empty?: true
	resumeAfter?: ScanStatePosition
	seen?: Record<string, string>
	lastFullScanAt?: string
	payload?: P
	targets?: Record<string, ScanTargetState<P>>
}

/** Units sent and skipped by one scan, saved in its state so a clean result is never mistaken for full coverage. */
export type ScanCoverage = {
	unitsScanned: number
	unitsChunked: number
	skipped: Record<string, number>
}

/**
 * The state envelope.
 *
 * - `retainedScope`: set by a full scan that could not cover some targets completely (a file it could not download,
 *   PDFs or images while their extraction is off). Earlier findings of these targets must be kept, so the platform
 *   does not delete findings the scan did not see again.
 * - `resumeTarget`: set when a delta stopped by its budget; the next delta starts with this target.
 */
export type ScanState<P = unknown> = {
	v: typeof SCAN_STATE_VERSION
	targets: Record<string, ScanTargetState<P>>
	coverage: ScanCoverage
	retainedScope?: string[]
	resumeTarget?: string
}

/** A short, stable reference to an identifier, for logs: the first 12 hex digits of its SHA-256. */
export const scanLogRef = (value: string): string => createHash('sha256').update(value).digest('hex').slice(0, 12)

const timeOf = (iso: string): number => Date.parse(iso)

/** The later of two ISO instants (either may be absent). */
export const laterCursor = (a: string | undefined, b: string | undefined): string | undefined =>
	a && b ? (timeOf(a) >= timeOf(b) ? a : b) : a ?? b

/**
 * The version recorded in `seen` for an item: its modified time, and its change counter when the source has one
 * (`<modifiedAt>#<version>`).
 */
export const seenValue = (modifiedAt: string, version?: string | number): string =>
	version !== undefined && version !== '' ? `${modifiedAt}#${version}` : modifiedAt

/** The modified time a `seen` value records, in ms. */
const seenTime = (value: string): number => timeOf(value.split('#')[0])

/**
 * Whether an item a delta re-reads in its overlap window was already scanned and has not changed since. With a
 * change counter the versions decide. Without one, an item in the newest instant the last scan saw (its modified time
 * is not before the saved cursor) is scanned again: it may have been edited again within the same second.
 */
export const isUnchanged = (
	previous: ScanTargetState | undefined,
	id: string,
	modifiedAt: string,
	version?: string | number
): boolean => {
	const value = previous?.seen?.[id]
	if (value === undefined || value !== seenValue(modifiedAt, version)) {
		return false
	}
	if (version !== undefined && version !== '') {
		return true
	}
	return previous?.cursor !== undefined && timeOf(modifiedAt) < timeOf(previous.cursor)
}

/** Where a target's enumeration starts: from a lower bound on the modified time, after an item, or the beginning. */
export type ScanStart = { since?: string; resumeAfter?: ScanStatePosition }

/**
 * Where to start a target: everything (a full scan, a target found empty, or a delta with nothing to start from),
 * right after the item a previous delta stopped at, from the saved cursor less the overlap, or from the lookback.
 */
export const startPosition = (
	mode: 'full' | 'delta',
	previous: ScanTargetState | undefined,
	options: { overlapMs: number; lookbackDays?: number; now: () => Date }
): ScanStart => {
	if (mode === 'full') {
		return {}
	}
	if (previous?.resumeAfter) {
		return { resumeAfter: previous.resumeAfter }
	}
	if (previous?.cursor) {
		return { since: new Date(timeOf(previous.cursor) - options.overlapMs).toISOString() }
	}
	if (previous?.empty) {
		return {}
	}
	if (options.lookbackDays) {
		return { since: new Date(options.now().getTime() - options.lookbackDays * 24 * 60 * 60 * 1000).toISOString() }
	}
	return {}
}

/**
 * The items a target's enumeration handled in this run that may still be in the next delta's overlap window, keyed
 * by id. Items arrive in ascending modified time, so entries older than the newest one less the overlap, and entries
 * past the per-target limit, are dropped as the scan advances: memory does not grow with the target.
 */
export class ScanVisited {
	private readonly items = new Map<string, { at: number; value: string }>()

	constructor(private readonly overlapMs: number, private readonly maxEntries: number) {}

	add(id: string, modifiedAt: string, value: string): void {
		const at = timeOf(modifiedAt)
		this.items.delete(id)
		this.items.set(id, { at, value })
		for (const [oldest, entry] of this.items) {
			if (this.items.size <= this.maxEntries && entry.at >= at - this.overlapMs) {
				break
			}
			this.items.delete(oldest)
		}
	}

	get size(): number {
		return this.items.size
	}

	*entries(): Generator<[string, string]> {
		for (const [id, { value }] of this.items) {
			yield [id, value]
		}
	}
}

/**
 * The `seen` map to save: the items this run handled plus those an earlier delta recorded, kept only while they are in
 * the overlap window before the cursor, newest first, at most maxEntries.
 */
export const seenWindow = (
	cursor: string | undefined,
	overlapMs: number,
	previous: Record<string, string> | undefined,
	visited: Iterable<[string, string]>,
	maxEntries: number
): Record<string, string> | undefined => {
	if (!cursor) {
		return undefined
	}
	const windowStart = timeOf(cursor) - overlapMs
	const merged = new Map(Object.entries(previous ?? {}))
	for (const [id, value] of visited) {
		merged.set(id, value)
	}
	const kept = [...merged.entries()]
		.filter(([, value]) => seenTime(value) >= windowStart)
		.sort((a, b) => seenTime(b[1]) - seenTime(a[1]))
		.slice(0, maxEntries)
	return kept.length > 0 ? Object.fromEntries(kept) : undefined
}

/** What one run of a target's enumeration did, for `nextTargetState`. */
export type ScanTargetRun<P = unknown> = {
	/** The last item handled (scanned, or skipped as unchanged), if any. */
	last?: ScanStatePosition
	/** The payload of the last item that carried one. */
	payload?: P
	/** Items handled in this run (`ScanVisited.entries()`). */
	visited: Iterable<[string, string]>
	/** The enumeration reached its end. */
	completed: boolean
	/** The enumeration started from the beginning (no lower bound and no resume position). */
	fromStart: boolean
	/** The run stopped at its budget, at an item boundary. */
	stopped: boolean
	/** When the scan started (ISO), recorded as `lastFullScanAt` by a complete full scan. */
	startedAt: string
}

/**
 * The state of a target after a run. The cursor never moves back: a delta that stops inside the overlap window has
 * only re-read items already covered by the saved cursor. A run stopped by its budget keeps where to resume; a
 * completed one drops it. A full scan does not carry an earlier delta's `seen` entries over.
 */
export const nextTargetState = <P>(
	mode: 'full' | 'delta',
	previous: ScanTargetState<P> | undefined,
	run: ScanTargetRun<P>,
	options: { overlapMs: number; maxSeenPerTarget: number }
): ScanTargetState<P> => {
	const resumeAfter = run.stopped ? run.last ?? previous?.resumeAfter : undefined
	const cursor = laterCursor(run.last?.cursor, previous?.cursor)
	const empty = cursor ? undefined : run.completed ? run.fromStart : previous?.empty
	const seen = seenWindow(
		cursor,
		options.overlapMs,
		mode === 'full' ? undefined : previous?.seen,
		run.visited,
		options.maxSeenPerTarget
	)
	const payload = run.payload !== undefined ? run.payload : previous?.payload
	const lastFullScanAt = mode === 'full' && run.completed ? run.startedAt : previous?.lastFullScanAt
	return {
		...(cursor ? { cursor } : {}),
		...(empty ? { empty: true as const } : {}),
		...(resumeAfter ? { resumeAfter: { cursor: resumeAfter.cursor, id: resumeAfter.id } } : {}),
		...(seen ? { seen } : {}),
		...(lastFullScanAt ? { lastFullScanAt } : {}),
		...(payload !== undefined ? { payload } : {}),
	}
}

/**
 * Keeps a state (mutated in place) under maxBytes of JSON by dropping the oldest `seen` entries of every target and
 * sub-target first. That is always safe: a dropped item is only scanned again by the next delta. Returns how many
 * entries were dropped and the final size, which can still be over maxBytes when there was not enough to drop.
 */
export const boundState = (
	state: ScanState<unknown>,
	maxBytes = MAX_SCAN_STATE_BYTES
): { dropped: number; bytes: number } => {
	let bytes = Buffer.byteLength(JSON.stringify(state), 'utf8')
	if (bytes <= maxBytes) {
		return { dropped: 0, bytes }
	}
	const entries: Array<{ owner: ScanTargetState; id: string; at: number; cost: number }> = []
	const collect = (targets: Record<string, ScanTargetState> | undefined) => {
		for (const target of Object.values(targets ?? {})) {
			for (const [id, value] of Object.entries(target?.seen ?? {})) {
				// "id":"value", plus a separator.
				const cost =
					Buffer.byteLength(JSON.stringify(id), 'utf8') + Buffer.byteLength(JSON.stringify(value), 'utf8') + 2
				entries.push({ owner: target, id, at: seenTime(value), cost })
			}
			collect(target?.targets)
		}
	}
	collect(state.targets)
	entries.sort((a, b) => a.at - b.at)

	let dropped = 0
	while (bytes > maxBytes && dropped < entries.length) {
		// Drop by the estimated cost, then measure again: the estimate ignores emptied maps.
		let excess = bytes - maxBytes
		while (excess > 0 && dropped < entries.length) {
			const entry = entries[dropped++]
			delete entry.owner.seen![entry.id]
			if (Object.keys(entry.owner.seen!).length === 0) {
				delete entry.owner.seen
			}
			excess -= entry.cost
		}
		bytes = Buffer.byteLength(JSON.stringify(state), 'utf8')
	}
	return { dropped, bytes }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const validTime = (value: unknown): boolean => typeof value === 'string' && !Number.isNaN(Date.parse(value))

/**
 * What is wrong with a saved state, or undefined when it can be used. A damaged value must fail clearly instead of
 * deep in paging. The message names the target, never an item id or a sub-target name.
 */
export const scanStateProblem = (state: unknown): string | undefined => {
	if (state === undefined || state === null) {
		return undefined
	}
	if (!isPlainObject(state)) {
		return 'the saved state is not an object'
	}
	if (state.v !== undefined && state.v !== SCAN_STATE_VERSION) {
		return `the saved state has version ${String(state.v).slice(
			0,
			16
		)}; this connector reads version ${SCAN_STATE_VERSION}`
	}
	if (state.targets !== undefined && !isPlainObject(state.targets)) {
		return 'the saved state has no valid targets'
	}
	const check = (id: string, target: unknown, depth: number): string | undefined => {
		if (!isPlainObject(target)) {
			return `the saved state of target ${id} is not an object`
		}
		const resume = target.resumeAfter
		const invalid =
			(target.cursor !== undefined && !validTime(target.cursor)) ||
			(resume !== undefined &&
				(!isPlainObject(resume) ||
					!validTime(resume.cursor) ||
					typeof resume.id !== 'string' ||
					resume.id === '')) ||
			(target.seen !== undefined &&
				(!isPlainObject(target.seen) || Object.values(target.seen).some((v) => typeof v !== 'string'))) ||
			(target.targets !== undefined && (!isPlainObject(target.targets) || depth > 0))
		if (invalid) {
			return `the saved state has an invalid cursor for target ${id}`
		}
		for (const nested of Object.values((target.targets as Record<string, unknown>) ?? {})) {
			const problem = check(`${id} (a sub-target)`, nested, depth + 1)
			if (problem) {
				return problem
			}
		}
		return undefined
	}
	for (const [id, target] of Object.entries((state.targets as Record<string, unknown>) ?? {})) {
		const problem = check(id, target, 0)
		if (problem) {
			return problem
		}
	}
	return undefined
}
