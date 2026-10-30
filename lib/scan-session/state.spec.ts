/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import {
	boundState,
	isUnchanged,
	nextTargetState,
	scanLogRef,
	ScanState,
	scanStateProblem,
	ScanVisited,
	seenValue,
	seenWindow,
	startPosition,
} from './state'

const MIN = 60 * 1000
const options = { overlapMs: 5 * MIN, maxSeenPerTarget: 1000 }
const run = (extra: Partial<Parameters<typeof nextTargetState>[2]> = {}) => ({
	visited: [] as Array<[string, string]>,
	completed: true,
	fromStart: false,
	stopped: false,
	startedAt: '2026-10-28T12:00:00Z',
	...extra,
})

describe('scan state', () => {
	it('records a change counter with the modified time when there is one', () => {
		expect(seenValue('2026-10-01T10:00:00Z')).toBe('2026-10-01T10:00:00Z')
		expect(seenValue('2026-10-01T10:00:00Z', 3)).toBe('2026-10-01T10:00:00Z#3')
		expect(seenValue('2026-10-01T10:00:00Z', '')).toBe('2026-10-01T10:00:00Z')
	})

	it('treats an item as unchanged only when its version matches', () => {
		const previous = {
			cursor: '2026-10-01T10:05:00Z',
			seen: { a: '2026-10-01T10:00:00Z#3', b: '2026-10-01T10:01:00Z' },
		}
		expect(isUnchanged(previous, 'a', '2026-10-01T10:00:00Z', 3)).toBe(true)
		expect(isUnchanged(previous, 'a', '2026-10-01T10:00:00Z', 4)).toBe(false) // edited again within the second
		expect(isUnchanged(previous, 'b', '2026-10-01T10:01:00Z')).toBe(true)
		expect(isUnchanged(previous, 'b', '2026-10-01T10:01:01Z')).toBe(false)
		expect(isUnchanged(previous, 'c', '2026-10-01T10:01:00Z')).toBe(false)
		expect(isUnchanged(undefined, 'b', '2026-10-01T10:01:00Z')).toBe(false)
	})

	it('scans again an item without a change counter in the newest instant the last scan saw', () => {
		const previous = { cursor: '2026-10-01T10:05:00Z', seen: { a: '2026-10-01T10:05:00Z' } }
		expect(isUnchanged(previous, 'a', '2026-10-01T10:05:00Z')).toBe(false)
		expect(
			isUnchanged({ ...previous, seen: { a: '2026-10-01T10:05:00Z#1' } }, 'a', '2026-10-01T10:05:00Z', 1)
		).toBe(true)
	})

	it('starts from the beginning, the resume position, the cursor less the overlap, or the lookback', () => {
		const now = () => new Date('2026-10-28T12:00:00Z')
		const opts = { overlapMs: 5 * MIN, lookbackDays: 2, now }
		expect(startPosition('full', { cursor: '2026-10-01T10:00:00Z' }, opts)).toEqual({})
		expect(startPosition('delta', { cursor: '2026-10-01T10:00:00Z' }, opts)).toEqual({
			since: '2026-10-01T09:55:00.000Z',
		})
		const resumeAfter = { cursor: '2026-10-01T10:00:00Z', id: 'x' }
		expect(startPosition('delta', { cursor: '2026-10-01T11:00:00Z', resumeAfter }, opts)).toEqual({ resumeAfter })
		expect(startPosition('delta', { empty: true }, opts)).toEqual({}) // never the lookback for a target found empty
		expect(startPosition('delta', undefined, opts)).toEqual({ since: '2026-10-26T12:00:00.000Z' })
		expect(startPosition('delta', undefined, { overlapMs: 0, now })).toEqual({})
	})

	it('keeps only visited items that can still be in the overlap window, at most the limit', () => {
		const visited = new ScanVisited(5 * MIN, 3)
		visited.add('a', '2026-10-01T10:00:00Z', 'va')
		visited.add('b', '2026-10-01T10:04:00Z', 'vb')
		visited.add('c', '2026-10-01T10:06:00Z', 'vc') // a is now more than 5 minutes older than the newest
		expect([...visited.entries()]).toEqual([
			['b', 'vb'],
			['c', 'vc'],
		])
		visited.add('d', '2026-10-01T10:06:00Z', 'vd')
		visited.add('e', '2026-10-01T10:07:00Z', 've')
		expect(visited.size).toBe(3)
		expect([...visited.entries()].map(([id]) => id)).toEqual(['c', 'd', 'e'])
	})

	it('saves the seen entries of the overlap window before the cursor, newest first', () => {
		const seen = seenWindow(
			'2026-10-01T10:10:00Z',
			5 * MIN,
			{ old: '2026-10-01T10:00:00Z', kept: '2026-10-01T10:06:00Z#2' },
			[['new', '2026-10-01T10:09:00Z']],
			10
		)
		expect(seen).toEqual({ new: '2026-10-01T10:09:00Z', kept: '2026-10-01T10:06:00Z#2' })
		expect(Object.keys(seen!)).toEqual(['new', 'kept'])
		expect(seenWindow(undefined, 5 * MIN, { a: '2026-10-01T10:00:00Z' }, [], 10)).toBeUndefined()
		expect(seenWindow('2026-10-01T10:10:00Z', 5 * MIN, undefined, [], 10)).toBeUndefined()
	})

	it('never moves the cursor back and keeps the resume position only after a budget stop', () => {
		const previous = { cursor: '2026-10-01T10:10:00Z', resumeAfter: { cursor: '2026-10-01T10:08:00Z', id: 'p' } }
		const last = { cursor: '2026-10-01T10:07:00Z', id: 'x' }
		expect(nextTargetState('delta', previous, run({ last }), options)).toEqual({ cursor: '2026-10-01T10:10:00Z' })
		expect(nextTargetState('delta', previous, run({ last, completed: false, stopped: true }), options)).toEqual({
			cursor: '2026-10-01T10:10:00Z',
			resumeAfter: last,
		})
		// Stopped before its first item: the previous resume position stands.
		expect(nextTargetState('delta', previous, run({ completed: false, stopped: true }), options)).toEqual(previous)
	})

	it('marks a target found empty from the beginning instead of using the clock as its cursor', () => {
		expect(nextTargetState('full', undefined, run({ fromStart: true }), options)).toEqual({
			empty: true,
			lastFullScanAt: '2026-10-28T12:00:00Z',
		})
		// A lookback window that found nothing says nothing about older items.
		expect(nextTargetState('delta', undefined, run({ fromStart: false }), options)).toEqual({})
		// Stopped before reading it: the mark stays.
		expect(nextTargetState('delta', { empty: true }, run({ completed: false, stopped: true }), options)).toEqual({
			empty: true,
		})
		// Once an item is found, the cursor replaces it.
		expect(
			nextTargetState(
				'delta',
				{ empty: true },
				run({ fromStart: true, last: { cursor: '2026-10-01T10:00:00Z', id: 'a' } }),
				options
			)
		).toEqual({ cursor: '2026-10-01T10:00:00Z' })
	})

	it('records lastFullScanAt only for a complete full scan and keeps the payload of the last item that had one', () => {
		const last = { cursor: '2026-10-01T10:00:00Z', id: 'a' }
		expect(
			nextTargetState('full', undefined, run({ last, completed: false }), options).lastFullScanAt
		).toBeUndefined()
		expect(nextTargetState('delta', { payload: 'old' }, run({ last }), options).payload).toBe('old')
		expect(nextTargetState('delta', { payload: 'old' }, run({ last, payload: 'new' }), options).payload).toBe('new')
	})

	it("does not carry an earlier delta's seen entries into a full scan", () => {
		const previous = { cursor: '2026-10-01T10:10:00Z', seen: { a: '2026-10-01T10:09:00Z' } }
		const last = { cursor: '2026-10-01T10:10:00Z', id: 'b' }
		expect(
			nextTargetState('full', previous, run({ last, visited: [['b', '2026-10-01T10:10:00Z']] }), options).seen
		).toEqual({
			b: '2026-10-01T10:10:00Z',
		})
		expect(
			nextTargetState('delta', previous, run({ last, visited: [['b', '2026-10-01T10:10:00Z']] }), options).seen
		).toEqual({
			b: '2026-10-01T10:10:00Z',
			a: '2026-10-01T10:09:00Z',
		})
	})

	it('drops the oldest seen entries across targets and sub-targets to fit the byte budget', () => {
		const seen = (prefix: string, minute: number, n: number) =>
			Object.fromEntries(
				Array.from({ length: n }, (_, i) => [
					`${prefix}${i}`,
					`2026-10-01T10:${String(minute).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z`,
				])
			)
		const state: ScanState = {
			v: 1,
			targets: {
				a: { cursor: '2026-10-01T11:00:00Z', seen: seen('a', 10, 50) },
				b: { targets: { child: { cursor: '2026-10-01T11:00:00Z', seen: seen('c', 20, 50) } } },
			},
			coverage: { unitsScanned: 0, unitsChunked: 0, skipped: {} },
		}
		const full = Buffer.byteLength(JSON.stringify(state))
		const { dropped, bytes } = boundState(state, full - 900)
		expect(bytes).toBeLessThanOrEqual(full - 900)
		expect(bytes).toBe(Buffer.byteLength(JSON.stringify(state)))
		expect(dropped).toBeGreaterThan(0)
		// The oldest entries (target a, minute 10) went first; the newer sub-target kept all of its entries.
		expect(Object.keys(state.targets.b.targets!.child.seen!)).toHaveLength(50)
		expect(Object.keys(state.targets.a.seen ?? {}).length).toBe(50 - dropped)
		expect(boundState(state, 10 * 1024 * 1024)).toEqual({ dropped: 0, bytes })
	})

	it('removes a seen map it emptied and reports a state that cannot fit', () => {
		const state: ScanState = {
			v: 1,
			targets: { a: { cursor: '2026-10-01T11:00:00Z', seen: { x: '2026-10-01T10:59:00Z' } } },
			coverage: { unitsScanned: 0, unitsChunked: 0, skipped: {} },
		}
		const { dropped, bytes } = boundState(state, 10)
		expect(dropped).toBe(1)
		expect(state.targets.a).toEqual({ cursor: '2026-10-01T11:00:00Z' })
		expect(bytes).toBeGreaterThan(10)
	})

	it('describes a damaged state without naming items or sub-targets', () => {
		expect(scanStateProblem(undefined)).toBeUndefined()
		expect(scanStateProblem({ v: 1, targets: { a: { cursor: '2026-10-01T10:00:00Z', seen: {} } } })).toBeUndefined()
		expect(scanStateProblem({ targets: {} })).toBeUndefined() // saved before versioning
		expect(scanStateProblem('x')).toMatch(/not an object/)
		expect(scanStateProblem({ v: 2, targets: {} })).toMatch(/version 2/)
		expect(scanStateProblem({ targets: [] })).toMatch(/no valid targets/)
		expect(scanStateProblem({ targets: { a: null } })).toMatch(/target a/)
		expect(scanStateProblem({ targets: { a: { cursor: 'yesterday' } } })).toMatch(/invalid cursor for target a/)
		expect(scanStateProblem({ targets: { a: { resumeAfter: { cursor: '2026-10-01T10:00:00Z' } } } })).toMatch(
			/target a/
		)
		expect(scanStateProblem({ targets: { a: { seen: ['x'] } } })).toMatch(/target a/)
		expect(scanStateProblem({ targets: { a: { seen: { x: 1 } } } })).toMatch(/target a/)
		const nested = scanStateProblem({ targets: { a: { targets: { secret_child: { cursor: 'bad' } } } } })
		expect(nested).toMatch(/target a \(a sub-target\)/)
		expect(nested).not.toMatch(/secret_child/)
		expect(scanStateProblem({ targets: { a: { targets: { b: { targets: {} } } } } })).toMatch(/target a/)
	})

	it('makes short, stable log references', () => {
		expect(scanLogRef('record-1')).toMatch(/^[0-9a-f]{12}$/)
		expect(scanLogRef('record-1')).toBe(scanLogRef('record-1'))
		expect(scanLogRef('record-1')).not.toBe(scanLogRef('record-2'))
	})
})
