/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { PassThrough, Readable } from 'stream'
import { ScanUnit } from '../commands'
import { logger } from '../logger'
import { RawResponse, ResponseType, ScanResponse } from '../response'
import * as sdk from '../index'
import {
	ScanSession,
	ScanSessionFile,
	ScanSessionItem,
	ScanSessionOptions,
	ScanSessionTarget,
	ScanSource,
	ScanTargetRef,
	ScanTargetUnavailableError,
} from './session'
import { ScanState, ScanStatePosition } from './state'

type Doc = {
	id: string
	at: string
	text?: string
	version?: number
	files?: Array<Partial<ScanSessionFile> & { name: string }>
}

/** An in-memory source: each target (or `target/child`) is a list of documents, enumerated in (at, id) order. */
class MemorySource implements ScanSource<string> {
	enumerations: Array<{ key: string; since?: string; resumeAfter?: ScanStatePosition }> = []
	fetched: string[] = []
	built: string[] = []
	files = new Map<string, Buffer | Readable | undefined>()
	failing = new Set<string>()
	unavailable = new Set<string>()
	/** Sub-target key -> items it yields before it becomes unavailable part-way through. */
	unavailableAfter = new Map<string, number>()

	constructor(public docs: Record<string, Doc[]>) {}

	async *enumerate(
		target: ScanTargetRef,
		since?: string,
		resumeAfter?: ScanStatePosition
	): AsyncGenerator<ScanSessionItem<string>> {
		const key = target.child === undefined ? target.id : `${target.id}/${target.child}`
		this.enumerations.push({ key, since, resumeAfter })
		if (this.failing.has(key)) {
			throw new Error('listing failed')
		}
		if (this.unavailable.has(key)) {
			throw new ScanTargetUnavailableError()
		}
		const sorted = [...(this.docs[key] ?? [])].sort(
			(a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id)
		)
		let yielded = 0
		for (const doc of sorted) {
			if (this.unavailableAfter.has(key) && yielded >= this.unavailableAfter.get(key)!) {
				throw new ScanTargetUnavailableError()
			}
			const at = Date.parse(doc.at)
			if (since && at < Date.parse(since)) {
				continue
			}
			if (resumeAfter) {
				const r = Date.parse(resumeAfter.cursor)
				if (at < r || (at === r && doc.id <= resumeAfter.id)) {
					continue
				}
			}
			yielded++
			const source = this
			yield {
				id: doc.id,
				modifiedAt: doc.at,
				version: doc.version,
				units: (function* (): Generator<ScanUnit> {
					source.built.push(doc.id)
					if (doc.text) {
						yield {
							unitId: `${key}:${doc.id}:body`,
							location: {
								type: 'EXAMPLE_ITEM',
								source: 'example',
								scanTarget: target.id,
								recordType: 'item',
								recordId: doc.id,
								field: 'body',
								visibility: 'internal',
							},
							content: { encoding: 'utf8', text: doc.text },
							mimeType: 'text/plain',
						}
					}
				})(),
				files: (doc.files ?? []).map((f) => ({
					ref: `${doc.id}/${f.name}`,
					unitId: `${key}:${doc.id}:${f.name}`,
					location: {
						type: 'EXAMPLE_FILE',
						source: 'example',
						scanTarget: target.id,
						recordType: 'item',
						recordId: doc.id,
						field: `files/${f.name}`,
						visibility: 'internal' as const,
					},
					...f,
				})),
				payload: `token-${doc.id}`,
			}
		}
	}

	async fetchFile(file: ScanSessionFile): Promise<Buffer | Readable | undefined> {
		this.fetched.push(file.ref)
		return this.files.has(file.ref) ? this.files.get(file.ref) : Buffer.from(`content of ${file.ref}`)
	}
}

const harness = (options: Partial<ScanSessionOptions> & { mode: 'full' | 'delta' }, resOptions = {}) => {
	const sink = new PassThrough({ objectMode: true })
	const frames: RawResponse[] = []
	sink.on('data', (f) => frames.push(f))
	const res = new ScanResponse(sink, resOptions)
	const session = new ScanSession<string>({
		input: {},
		res,
		keepAliveMs: 0,
		now: () => new Date('2026-10-28T12:00:00Z'),
		...options,
	})
	const units = () => frames.filter((f) => f.type === ResponseType.ScanUnit).map((f: any) => f.data)
	const states = () =>
		frames.filter((f) => f.type === ResponseType.State).map((f) => f.data as unknown as ScanState<string>)
	return { session, frames, units, states, lastState: () => states()[states().length - 1] }
}

const targets = (...ids: string[]): ScanSessionTarget[] => ids.map((id) => ({ id }))
const tick = () => new Promise((resolve) => setImmediate(resolve))

describe('ScanSession full scan', () => {
	it('scans every target and saves a v1 state with a cursor per target, from the items, not the clock', async () => {
		const source = new MemorySource({
			pages: [
				{ id: 'p2', at: '2026-10-01T10:02:00Z', text: 'two' },
				{ id: 'p1', at: '2026-10-01T10:01:00Z', text: 'one' },
			],
			empty: [],
		})
		const { session, units, lastState } = harness({ mode: 'full', declaredTargets: ['pages', 'empty'] })

		const state = await session.run(targets('pages', 'empty'), source)

		expect(units().map((u) => u.content.text)).toEqual(['one', 'two'])
		expect(state).toEqual(lastState())
		expect(state).toEqual({
			v: 1,
			targets: {
				pages: {
					cursor: '2026-10-01T10:02:00Z',
					seen: { p2: '2026-10-01T10:02:00Z', p1: '2026-10-01T10:01:00Z' },
					lastFullScanAt: '2026-10-28T12:00:00.000Z',
					payload: 'token-p2',
				},
				empty: { empty: true, lastFullScanAt: '2026-10-28T12:00:00.000Z' },
			},
			coverage: { unitsScanned: 2, unitsChunked: 0, skipped: {} },
		})
	})

	it('throws when a target cannot be enumerated, instead of completing without it', async () => {
		const source = new MemorySource({ pages: [{ id: 'p1', at: '2026-10-01T10:01:00Z', text: 'one' }] })
		source.failing.add('pages')
		const { session } = harness({ mode: 'full' })
		await expect(session.run(targets('pages'), source)).rejects.toThrow('listing failed')
	})

	it('must be given every declared target, and only declared ones', async () => {
		const source = new MemorySource({})
		await expect(
			harness({ mode: 'full', declaredTargets: ['a', 'b'] }).session.run(targets('a'), source)
		).rejects.toThrow(/missing: b/)
		await expect(
			harness({ mode: 'full', declaredTargets: ['a'] }).session.run(targets('a', 'x'), source)
		).rejects.toThrow(/Unknown secret scan targets: x/)
		await expect(harness({ mode: 'full' }).session.run(targets('a', 'a'), source)).rejects.toThrow(/listed once/)
	})

	it('ignores saved state: a full scan starts over', async () => {
		const source = new MemorySource({ pages: [{ id: 'p1', at: '2026-10-01T10:01:00Z', text: 'one' }] })
		const { session, units } = harness({
			mode: 'full',
			input: {
				state: {
					v: 1,
					targets: { pages: { cursor: '2026-10-02T00:00:00Z', seen: { p1: '2026-10-01T10:01:00Z' } } },
				},
			},
		})
		await session.run(targets('pages'), source)
		expect(units()).toHaveLength(1)
		expect(source.enumerations[0]).toEqual({ key: 'pages', since: undefined, resumeAfter: undefined })
	})

	it('rejects items out of order and items without an id or time', async () => {
		const bad = (items: any[]) =>
			({
				enumerate: async function* () {
					yield* items
				},
			} as ScanSource<string>)
		const { session } = harness({ mode: 'full' })
		await expect(
			session.run(
				targets('a'),
				bad([
					{ id: 'x', modifiedAt: '2026-10-02T00:00:00Z' },
					{ id: 'y', modifiedAt: '2026-10-01T00:00:00Z' },
				])
			)
		).rejects.toThrow(/ascending/)
		await expect(
			harness({ mode: 'full' }).session.run(targets('a'), bad([{ modifiedAt: '2026-10-02T00:00:00Z' }]))
		).rejects.toThrow(/id/)
		await expect(
			harness({ mode: 'full' }).session.run(targets('a'), bad([{ id: 'x', modifiedAt: 'soon' }]))
		).rejects.toThrow(/modifiedAt/)
	})

	it('checkpoints the state within a target', async () => {
		const docs = Array.from({ length: 5 }, (_, i) => ({ id: `d${i}`, at: `2026-10-01T10:0${i}:00Z`, text: 't' }))
		const { session, states } = harness({ mode: 'full', checkpointEvery: 2 })
		await session.run(targets('docs'), new MemorySource({ docs }))
		expect(states().map((s) => s.targets.docs.cursor)).toEqual([
			'2026-10-01T10:01:00Z',
			'2026-10-01T10:03:00Z',
			'2026-10-01T10:04:00Z',
			'2026-10-01T10:04:00Z',
		])
	})
})

describe('ScanSession delta', () => {
	const previous = (targetsState: any, extra = {}) => ({
		v: 1,
		targets: targetsState,
		coverage: { unitsScanned: 0, unitsChunked: 0, skipped: {} },
		...extra,
	})

	it('re-reads from the cursor less the overlap and skips items already scanned unless they changed', async () => {
		const source = new MemorySource({
			pages: [
				{ id: 'same', at: '2026-10-01T10:00:00Z', text: 'unchanged', version: 1 },
				{ id: 'edited', at: '2026-10-01T10:00:00Z', text: 'edited in the same second', version: 2 },
				{ id: 'late', at: '2026-10-01T10:01:00Z', text: 'committed late' },
				{ id: 'new', at: '2026-10-01T10:06:00Z', text: 'new' },
			],
		})
		const { session, units, lastState } = harness({
			mode: 'delta',
			input: {
				state: previous({
					pages: {
						cursor: '2026-10-01T10:05:00Z',
						seen: { same: '2026-10-01T10:00:00Z#1', edited: '2026-10-01T10:00:00Z#1' },
					},
				}),
			},
		})
		await session.run(targets('pages'), source)

		expect(source.enumerations[0].since).toBe('2026-10-01T10:00:00.000Z')
		expect(units().map((u) => u.content.text)).toEqual(['edited in the same second', 'committed late', 'new'])
		expect(source.built).not.toContain('same') // the units of a skipped item are never built
		expect(lastState().targets.pages.cursor).toBe('2026-10-01T10:06:00Z')
		// The window moved with the cursor: the 10:00 items are out of the next delta's overlap.
		expect(lastState().targets.pages.seen).toEqual({ new: '2026-10-01T10:06:00Z', late: '2026-10-01T10:01:00Z' })
	})

	it('scans again an item without a change counter at the saved cursor, which may have changed within that second', async () => {
		const source = new MemorySource({
			pages: [
				{ id: 'older', at: '2026-10-01T10:04:00Z', text: 'older' },
				{ id: 'atCursor', at: '2026-10-01T10:05:00Z', text: 'at the cursor' },
			],
		})
		const { session, units } = harness({
			mode: 'delta',
			input: {
				state: previous({
					pages: {
						cursor: '2026-10-01T10:05:00Z',
						seen: { older: '2026-10-01T10:04:00Z', atCursor: '2026-10-01T10:05:00Z' },
					},
				}),
			},
		})
		await session.run(targets('pages'), source)
		expect(units().map((u) => u.content.text)).toEqual(['at the cursor'])
	})

	it('stops at an item boundary after maxUnits, and the next delta resumes there, starting with that target', async () => {
		const docs = {
			a: [
				{ id: 'a1', at: '2026-10-01T10:00:00Z', text: 'a1' },
				{ id: 'a2', at: '2026-10-01T10:00:00Z', text: 'a2' },
				{ id: 'a3', at: '2026-10-01T10:00:00Z', text: 'a3' },
			],
			b: [{ id: 'b1', at: '2026-10-01T09:00:00Z', text: 'b1' }],
		}
		const first = harness({ mode: 'delta', input: { maxUnits: 2 } })
		await first.session.run(targets('a', 'b'), new MemorySource(docs))
		expect(first.units().map((u) => u.content.text)).toEqual(['a1', 'a2'])
		const saved = first.lastState()
		expect(saved.resumeTarget).toBe('a')
		expect(saved.targets.a.resumeAfter).toEqual({ cursor: '2026-10-01T10:00:00Z', id: 'a2' })
		expect(saved.targets.b).toBeUndefined()

		const source = new MemorySource(docs)
		const second = harness({ mode: 'delta', input: { maxUnits: 5, state: saved } })
		await second.session.run(targets('b', 'a'), source)
		expect(source.enumerations.map((e) => e.key)).toEqual(['a', 'b']) // the target it stopped in goes first
		expect(second.units().map((u) => u.content.text)).toEqual(['a3', 'b1'])
		expect(second.lastState().resumeTarget).toBeUndefined()
		expect(second.lastState().targets.a.resumeAfter).toBeUndefined()
	})

	it('does not touch a target when the budget is used up before it', async () => {
		const source = new MemorySource({
			a: [{ id: 'a1', at: '2026-10-01T10:00:00Z', text: 'a1' }],
			b: [{ id: 'b1', at: '2026-10-01T10:00:00Z', text: 'b1' }],
		})
		const { session, lastState } = harness({
			mode: 'delta',
			input: { maxUnits: 1, state: previous({ b: { cursor: '2026-10-01T09:00:00Z' } }) },
			shouldStop: () => false,
		})
		await session.run(targets('a', 'b'), source)
		expect(source.enumerations.map((e) => e.key)).toEqual(['a'])
		expect(lastState().targets.b).toEqual({ cursor: '2026-10-01T09:00:00Z' })
	})

	it('stops on shouldStop too', async () => {
		let calls = 0
		const source = new MemorySource({
			a: [
				{ id: 'a1', at: '2026-10-01T10:00:00Z', text: 'a1' },
				{ id: 'a2', at: '2026-10-01T10:01:00Z', text: 'a2' },
			],
		})
		const { session, units, lastState } = harness({ mode: 'delta', shouldStop: () => ++calls > 2 })
		await session.run(targets('a'), source)
		expect(units()).toHaveLength(1)
		expect(lastState().targets.a.resumeAfter).toEqual({ cursor: '2026-10-01T10:00:00Z', id: 'a1' })
	})

	it('starts a target found empty from the beginning, not from the lookback', async () => {
		const source = new MemorySource({
			a: [{ id: 'old', at: '2020-01-01T00:00:00Z', text: 'created with an old time' }],
		})
		const { session, units } = harness({
			mode: 'delta',
			input: { lookbackDays: 1, state: previous({ a: { empty: true } }) },
		})
		await session.run(targets('a'), source)
		expect(source.enumerations[0].since).toBeUndefined()
		expect(units()).toHaveLength(1)
	})

	it('uses lookbackDays for a target without state and leaves its cursor unset when nothing is found', async () => {
		const source = new MemorySource({ a: [] })
		const { session, lastState } = harness({ mode: 'delta', input: { lookbackDays: 2 } })
		await session.run(targets('a'), source)
		expect(source.enumerations[0].since).toBe('2026-10-26T12:00:00.000Z')
		expect(lastState().targets.a).toEqual({})
	})

	it('drops the state of targets no longer declared and keeps the others', async () => {
		const { session, lastState } = harness({
			mode: 'delta',
			declaredTargets: ['a', 'b'],
			input: {
				state: previous({
					a: { cursor: '2026-10-01T10:00:00Z' },
					b: { cursor: '2026-10-01T11:00:00Z' },
					gone: { cursor: '2026-10-01T12:00:00Z' },
				}),
			},
		})
		await session.run(targets('a'), new MemorySource({ a: [] }))
		expect(Object.keys(lastState().targets).sort()).toEqual(['a', 'b'])
	})

	it('rejects a damaged state and a state of another version', async () => {
		const source = new MemorySource({})
		await expect(
			harness({ mode: 'delta', input: { state: { targets: { a: { cursor: 'nope' } } } } }).session.run(
				targets('a'),
				source
			)
		).rejects.toThrow(/invalid cursor for target a/)
		await expect(
			harness({ mode: 'delta', input: { state: { v: 9, targets: {} } } }).session.run(targets('a'), source)
		).rejects.toThrow(/version 9/)
	})

	it('reads a state saved before versioning', async () => {
		const source = new MemorySource({ a: [] })
		const { session, lastState } = harness({
			mode: 'delta',
			input: { state: { targets: { a: { cursor: '2026-10-01T10:00:00Z' } } } },
		})
		await session.run(targets('a'), source)
		expect(lastState()).toMatchObject({ v: 1, targets: { a: { cursor: '2026-10-01T10:00:00Z' } } })
	})

	it('rejects a non-positive maxUnits', () => {
		expect(() => harness({ mode: 'delta', input: { maxUnits: 0 } })).toThrow(RangeError)
	})
})

describe('ScanSession sub-targets', () => {
	const tables = (names: () => Promise<string[]>): ScanSessionTarget[] => [{ id: 'tables', children: names }]

	it('scans each sub-target with its own cursor and drops the state of sub-targets that no longer exist', async () => {
		const source = new MemorySource({
			'tables/t1': [{ id: 'r1', at: '2026-10-01T10:00:00Z', text: 'one' }],
			'tables/t2': [{ id: 'r2', at: '2026-10-01T11:00:00Z', text: 'two' }],
		})
		const { session, lastState } = harness({
			mode: 'delta',
			input: {
				state: {
					v: 1,
					targets: {
						tables: {
							targets: {
								t1: { cursor: '2026-10-01T09:00:00Z' },
								dropped: { cursor: '2026-10-01T09:00:00Z' },
							},
						},
					},
				},
			},
		})
		await session.run(
			tables(async () => ['t1', 't2']),
			source
		)
		expect(source.enumerations).toEqual([
			{ key: 'tables/t1', since: '2026-10-01T08:55:00.000Z', resumeAfter: undefined },
			{ key: 'tables/t2', since: undefined, resumeAfter: undefined },
		])
		expect(Object.keys(lastState().targets.tables.targets!)).toEqual(['t1', 't2'])
		expect(lastState().targets.tables.targets!.t2.cursor).toBe('2026-10-01T11:00:00Z')
	})

	it('fails a full scan whose sub-targets cannot be listed, and lets a delta keep their state', async () => {
		const failing = async () => {
			throw new Error('cannot list')
		}
		await expect(harness({ mode: 'full' }).session.run(tables(failing), new MemorySource({}))).rejects.toThrow(
			'cannot list'
		)

		const kept = { v: 1, targets: { tables: { targets: { t1: { cursor: '2026-10-01T09:00:00Z' } } } } }
		const delta = harness({ mode: 'delta', input: { state: kept } })
		await delta.session.run(tables(failing), new MemorySource({}))
		expect(delta.lastState().targets).toEqual(kept.targets)

		const source = new MemorySource({ 'tables/t2': [{ id: 'r2', at: '2026-10-01T11:00:00Z', text: 'two' }] })
		source.unavailable.add('tables/t1')
		const unavailable = harness({ mode: 'delta', input: { state: kept } })
		await unavailable.session.run(
			tables(async () => ['t1', 't2']),
			source
		)
		expect(unavailable.lastState().targets.tables.targets).toEqual({
			t1: { cursor: '2026-10-01T09:00:00Z' },
			t2: expect.objectContaining({ cursor: '2026-10-01T11:00:00Z' }),
		})
	})

	it("skips an unavailable sub-target in a full scan and keeps the target's earlier findings", async () => {
		const source = new MemorySource({ 'tables/t2': [{ id: 'r2', at: '2026-10-01T11:00:00Z', text: 'two' }] })
		source.unavailable.add('tables/t1')
		const { session, units, lastState } = harness({ mode: 'full' })
		await session.run(
			tables(async () => ['t1', 't2']),
			source
		)
		expect(units().map((u: any) => u.unitId)).toEqual(['tables/t2:r2:body'])
		expect(lastState().coverage.skipped).toEqual({ unavailable: 1 })
		expect(lastState().retainedScope).toEqual(['tables'])
		expect(Object.keys(lastState().targets.tables.targets!)).toEqual(['t2'])
	})

	it('skips a sub-target that becomes unavailable part-way, and a delta keeps the state it had', async () => {
		const docs = {
			'tables/t1': [
				{ id: 'a', at: '2026-10-01T10:00:00Z', text: 'a' },
				{ id: 'b', at: '2026-10-01T10:01:00Z', text: 'b' },
				{ id: 'c', at: '2026-10-01T10:02:00Z', text: 'c' },
			],
			'tables/t2': [{ id: 'r2', at: '2026-10-01T11:00:00Z', text: 'two' }],
		}
		const full = new MemorySource(docs)
		full.unavailableAfter.set('tables/t1', 1)
		const f = harness({ mode: 'full', checkpointEvery: 1 })
		await f.session.run(
			tables(async () => ['t1', 't2']),
			full
		)
		expect(f.lastState().retainedScope).toEqual(['tables'])
		expect(f.lastState().targets.tables.targets!.t1).toBeUndefined()
		expect(f.lastState().targets.tables.targets!.t2).toBeDefined()

		const kept = { v: 1, targets: { tables: { targets: { t1: { cursor: '2026-10-01T09:00:00Z' } } } } }
		const delta = new MemorySource(docs)
		delta.unavailableAfter.set('tables/t1', 2)
		const d = harness({ mode: 'delta', input: { state: kept }, checkpointEvery: 1 })
		await d.session.run(
			tables(async () => ['t1', 't2']),
			delta
		)
		expect(d.lastState().targets.tables.targets!.t1).toEqual({ cursor: '2026-10-01T09:00:00Z' })
		expect(d.lastState().retainedScope).toBeUndefined()
	})

	it('fails when every listed sub-target is unavailable', async () => {
		const source = new MemorySource({})
		source.unavailable.add('tables/t1')
		source.unavailable.add('tables/t2')
		await expect(
			harness({ mode: 'full' }).session.run(
				tables(async () => ['t1', 't2']),
				source
			)
		).rejects.toThrow('None of the 2 sub-targets of secret scan target tables could be read')
		const kept = { v: 1, targets: { tables: { targets: { t1: { cursor: '2026-10-01T09:00:00Z' } } } } }
		await expect(
			harness({ mode: 'delta', input: { state: kept } }).session.run(
				tables(async () => ['t1', 't2']),
				source
			)
		).rejects.toThrow('None of the 2 sub-targets')
	})

	it('resumes with the sub-target a delta stopped in', async () => {
		const source = new MemorySource({
			'tables/t1': [],
			'tables/t2': [{ id: 'r', at: '2026-10-01T11:00:00Z', text: 'x' }],
		})
		const state = {
			v: 1,
			targets: {
				tables: {
					targets: {
						t2: {
							cursor: '2026-10-01T09:00:00Z',
							resumeAfter: { cursor: '2026-10-01T10:00:00Z', id: 'q' },
						},
					},
				},
			},
			resumeTarget: 'tables',
		}
		await harness({ mode: 'delta', input: { state } }).session.run(
			tables(async () => ['t1', 't2']),
			source
		)
		expect(source.enumerations.map((e) => e.key)).toEqual(['tables/t2', 'tables/t1'])
	})
})

describe('ScanSession files', () => {
	const doc = (files: Doc['files']) => new MemorySource({ items: [{ id: 'i1', at: '2026-10-01T10:00:00Z', files }] })

	it('downloads only files the policy allows and sends them as file units', async () => {
		const source = doc([
			{ name: 'notes.txt', mimeType: 'text/plain' },
			{ name: 'call.mp3', mimeType: 'audio/mpeg' },
			{ name: 'big.zip', mimeType: 'application/zip', sizeBytes: 11 * 1024 * 1024 },
		])
		const { session, units, lastState } = harness({ mode: 'full' })
		await session.run(targets('items'), source)
		expect(source.fetched).toEqual(['i1/notes.txt'])
		expect(units().map((u) => [u.content.kind, u.location.field])).toEqual([['file', 'files/notes.txt']])
		expect(lastState().coverage).toEqual({
			unitsScanned: 1,
			unitsChunked: 0,
			skipped: { policySkipped: 1, oversize: 1 },
		})
		expect(lastState().retainedScope).toBeUndefined()
	})

	it('retains the target of a full scan that skipped PDFs, images or a file it could not download', async () => {
		const source = doc([
			{ name: 'runbook.pdf', mimeType: 'application/pdf' },
			{ name: 'gone.txt', mimeType: 'text/plain' },
		])
		source.files.set('i1/gone.txt', undefined)
		const { session, lastState } = harness({ mode: 'full' })
		await session.run(targets('items', 'other'), source)
		expect(source.fetched).toEqual(['i1/gone.txt'])
		expect(lastState().coverage.skipped).toEqual({ pdfDisabled: 1, unavailable: 1 })
		expect(lastState().retainedScope).toEqual(['items'])
	})

	it('downloads no file when files is false, and does not retain them', async () => {
		const source = doc([{ name: 'notes.txt', mimeType: 'text/plain' }])
		const { session, lastState } = harness({ mode: 'full', input: { extraction: { files: false } } })
		await session.run(targets('items'), source)
		expect(source.fetched).toEqual([])
		expect(lastState().coverage.skipped).toEqual({ unlicensed: 1 })
		expect(lastState().retainedScope).toBeUndefined()
	})

	it('reads a streamed file up to the size limit', async () => {
		const source = doc([
			{ name: 'small.txt', mimeType: 'text/plain' },
			{ name: 'large.txt', mimeType: 'text/plain' },
		])
		source.files.set('i1/small.txt', Readable.from([Buffer.from('ab'), Buffer.from('cd')]))
		const large = Readable.from(
			(function* () {
				for (let i = 0; i < 100; i++) yield Buffer.alloc(10)
			})()
		)
		source.files.set('i1/large.txt', large)
		const { session, units, lastState } = harness({ mode: 'full' }, { maxBlobBytes: 64 })
		await session.run(targets('items'), source)
		expect(units().map((u) => Buffer.from(u.content.text, 'base64').toString())).toEqual(['abcd'])
		expect(lastState().coverage.skipped).toEqual({ oversize: 1 })
		await tick()
		expect(large.destroyed).toBe(true)
	})

	it('fails when an item has files and the source cannot fetch them', async () => {
		const source = doc([{ name: 'notes.txt', mimeType: 'text/plain' }]) as any
		source.fetchFile = undefined
		await expect(harness({ mode: 'full' }).session.run(targets('items'), source)).rejects.toThrow(/fetchFile/)
	})

	it('lets the connector count its own skips and retain targets', async () => {
		const { session, lastState } = harness({ mode: 'full' })
		session.skip('unavailable', 'items')
		session.skip('custom')
		session.retain('other')
		expect(session.counts.skipped).toEqual({ unavailable: 1, custom: 1 })
		await session.run(targets('items'), new MemorySource({}))
		expect(lastState().retainedScope).toEqual(['items', 'other'])
	})
})

describe('ScanSession state budget and logs', () => {
	it('keeps the saved state under its byte budget by dropping the oldest seen entries', async () => {
		const docs = Array.from({ length: 400 }, (_, i) => ({
			id: `item-${String(i).padStart(4, '0')}`,
			at: new Date(Date.parse('2026-10-01T10:00:00Z') + i * 100).toISOString(),
			text: 'x',
		}))
		const { session, lastState } = harness({ mode: 'full', maxStateBytes: 4096 })
		await session.run(targets('a'), new MemorySource({ a: docs }))
		const state = lastState()
		expect(Buffer.byteLength(JSON.stringify(state))).toBeLessThanOrEqual(4096)
		const kept = Object.keys(state.targets.a.seen!)
		expect(kept.length).toBeGreaterThan(0)
		expect(kept.length).toBeLessThan(400)
		expect(kept).toContain('item-0399') // the newest are kept
		expect(kept).not.toContain('item-0000')
	})

	it('logs counts and target ids only, never item ids, sub-target names or content', async () => {
		const lines: string[] = []
		const spies = (['info', 'warn', 'debug', 'error'] as const).map((level) =>
			jest.spyOn(logger, level).mockImplementation(((msg: any) => {
				lines.push(typeof msg === 'string' ? msg : JSON.stringify(msg))
			}) as any)
		)
		try {
			const source = new MemorySource({
				items: [
					{
						id: 'record-secret-id',
						at: '2026-10-01T10:00:00Z',
						text: 'password=hunter2',
						files: [{ name: 'customer-file.pdf', mimeType: 'application/pdf' }],
					},
				],
				'tables/customer_table': [{ id: 'row-secret-id', at: '2026-10-01T10:00:00Z', text: 'token' }],
			})
			const { session } = harness({
				mode: 'delta',
				input: {
					maxUnits: 1,
					state: {
						v: 1,
						targets: {
							items: {
								cursor: '2026-10-01T09:00:00Z',
								seen: { 'record-secret-id': '2026-10-01T10:00:00Z' },
							},
						},
					},
				},
			})
			await session.run([{ id: 'items' }, { id: 'tables', children: async () => ['customer_table'] }], source)
		} finally {
			spies.forEach((s) => s.mockRestore())
		}
		expect(lines.length).toBeGreaterThan(0)
		const all = lines.join('\n')
		for (const secret of [
			'record-secret-id',
			'row-secret-id',
			'customer_table',
			'customer-file',
			'hunter2',
			'token',
		]) {
			expect(all).not.toContain(secret)
		}
	})

	it('sends keep-alives while it runs', async () => {
		jest.useFakeTimers()
		try {
			const { session, frames } = harness({ mode: 'full', keepAliveMs: 1000 })
			let release!: () => void
			const gate = new Promise<void>((resolve) => (release = resolve))
			const source: ScanSource<string> = {
				async *enumerate() {
					await gate
				},
			}
			const p = session.run(targets('a'), source)
			await Promise.resolve()
			jest.advanceTimersByTime(2500)
			release()
			await p
			expect(frames.filter((f) => f.type === ResponseType.KeepAlive).length).toBe(3)
		} finally {
			jest.useRealTimers()
		}
	})

	it('is exported from the package', () => {
		expect(sdk.ScanSession).toBe(ScanSession)
		expect(sdk.ScanTargetUnavailableError).toBe(ScanTargetUnavailableError)
		expect(typeof sdk.boundState).toBe('function')
	})
})
