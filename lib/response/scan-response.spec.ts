/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { PassThrough, Transform, TransformCallback, Writable } from 'stream'
import { ScanUnit } from '../commands'
import { RawResponse, ResponseType, ScanResponse } from './index'
import { chunkUtf8, SCAN_CHUNK_OVERLAP_BYTES } from './scan-chunk'

const unit = (text: string, extra: Partial<ScanUnit> = {}): ScanUnit => ({
	unitId: 'servicenow:incident:1:description',
	location: {
		type: 'SERVICENOW_RECORD',
		source: 'servicenow',
		scanTarget: 'incidents',
		recordType: 'incident',
		recordId: '1',
		field: 'description',
		displayId: 'INC1',
		visibility: 'internal',
	},
	content: { encoding: 'utf8', text },
	mimeType: 'text/plain',
	...extra,
})

/** Object-mode sink that records frames and completes each write only when the test releases it. */
class GatedSink extends Writable {
	frames: RawResponse[] = []
	private pending: Array<() => void> = []

	constructor(highWaterMark = 16) {
		super({ objectMode: true, highWaterMark })
	}

	_write(frame: RawResponse, _: BufferEncoding, callback: (error?: Error | null) => void): void {
		this.frames.push(frame)
		this.pending.push(() => callback())
	}

	get waiting(): number {
		return this.pending.length
	}

	release(n = Infinity): void {
		while (n-- > 0 && this.pending.length > 0) {
			this.pending.shift()!()
		}
	}
}

const tick = () => new Promise((resolve) => setImmediate(resolve))

/** Resolves once cond() holds, checking after every turn of the event loop. */
const until = async (cond: () => boolean, timeoutMs = 5000) => {
	const deadline = Date.now() + timeoutMs
	while (!cond()) {
		if (Date.now() > deadline) {
			throw new Error('condition not reached')
		}
		await new Promise((resolve) => setTimeout(resolve, 1))
	}
}

/** Lets pending scans run for a while, long enough for several in-flight polls. */
const settle = async () => {
	for (let i = 0; i < 20; i++) {
		await new Promise((resolve) => setTimeout(resolve, 1))
	}
}

describe('ScanResponse', () => {
	it('writes a scanUnit frame and resolves once accepted', async () => {
		const sink = new PassThrough({ objectMode: true })
		const frames: RawResponse[] = []
		sink.on('data', (f) => frames.push(f))
		const res = new ScanResponse(sink)

		const result = await res.scan(unit('aws_secret_access_key=abc'))

		expect(result).toEqual({ accepted: true, chunks: 1 })
		expect(frames).toHaveLength(1)
		expect(frames[0].type).toBe(ResponseType.ScanUnit)
		const data: any = frames[0].data
		expect(data.unitId).toBe('servicenow:incident:1:description')
		expect(data.content).toEqual({ encoding: 'utf8', text: 'aws_secret_access_key=abc' })
		expect(data.sizeBytes).toBe(25)
		expect(data.chunk).toEqual({ index: 0, count: 1, overlapBytes: 0, offset: 0 })
	})

	it('does not resolve until the sink drains (backpressure reaches the connector)', async () => {
		const sink = new GatedSink(1)
		const res = new ScanResponse(sink)

		let resolved = false
		const p = res.scan(unit('x')).then(() => (resolved = true))
		await tick()
		expect(resolved).toBe(false)

		sink.release()
		await p
		expect(resolved).toBe(true)
	})

	it('caps bytes in flight even when the sink accepts many objects', async () => {
		const sink = new GatedSink(1000) // object high-water mark never reached
		// The cap is never below one unit (maxUnitBytes, at least 16 KiB): 16 KiB here.
		const res = new ScanResponse(sink, { maxUnitBytes: 16384, maxInFlightBytes: 16384 })
		const text = 'a'.repeat(6000)

		await res.scan(unit(text))
		await res.scan(unit(text))
		let third = false
		const p = res.scan(unit(text)).then(() => (third = true))
		await until(() => sink.writableLength === 3)
		await settle()
		expect(third).toBe(false) // 18000 bytes would be in flight
		expect(sink.writableLength).toBe(3) // all three were written; the third scan waits for acceptance

		sink.release(1)
		await p
		expect(third).toBe(true)
		sink.release()
	})

	it('rejects a second scan() while the first is still pending', async () => {
		const sink = new GatedSink(1)
		const res = new ScanResponse(sink)

		const first = res.scan(unit('one'))
		await expect(res.scan(unit('two'))).rejects.toThrow(/await every res.scan\(\) call/)
		sink.release()
		await first
		const third = res.scan(unit('three'))
		await tick()
		sink.release()
		await expect(third).resolves.toEqual({ accepted: true, chunks: 1 })
	})

	it('skips binary units while extraction is off, without writing anything', async () => {
		const sink = new GatedSink()
		const res = new ScanResponse(sink, { extraction: { documents: false, pdf: false, ocr: false } })

		const result = await res.scan(
			unit('UEsDBA==', { content: { encoding: 'base64', text: 'UEsDBA==' }, mimeType: 'application/zip' })
		)

		expect(result).toEqual({ accepted: false, chunks: 0, skipped: 'binaryNotExtracted' })
		expect(sink.frames).toHaveLength(0)
	})

	it('chunks large text with overlap so a secret on a boundary is found whole', async () => {
		const sink = new PassThrough({ objectMode: true })
		const frames: RawResponse[] = []
		sink.on('data', (f) => frames.push(f))
		const res = new ScanResponse(sink, { maxUnitBytes: 16384 })
		const secret = 'SECRET-ON-THE-CHUNK-BOUNDARY-0123456789A' // stands in for a secret; the SDK never inspects it
		const text = 'x'.repeat(16370) + secret + 'y'.repeat(40000) // the secret straddles the first boundary

		const result = await res.scan(unit(text))

		expect(result.accepted).toBe(true)
		expect(result.chunks).toBe(frames.length)
		expect(frames.length).toBeGreaterThan(1)
		const chunks = frames.map((f: any) => f.data)
		chunks.forEach((c: any, i: number) => {
			expect(Buffer.byteLength(c.content.text)).toBeLessThanOrEqual(16384)
			expect(c.chunk.index).toBe(i)
			expect(c.chunk.count).toBe(frames.length)
			expect(c.chunk.overlapBytes).toBe(SCAN_CHUNK_OVERLAP_BYTES) // never smaller than the documented overlap
			expect(c.sizeBytes).toBe(Buffer.byteLength(text))
			expect(c.unitId).toBe('servicenow:incident:1:description') // identity does not depend on chunking
		})
		expect(chunks.some((c: any) => c.content.text.includes(secret))).toBe(true)
	})

	it('rejects pending and later scans when the stream closes', async () => {
		const sink = new GatedSink(1)
		const res = new ScanResponse(sink)

		const p = res.scan(unit('x'))
		sink.destroy()
		await expect(p).rejects.toThrow(/closed/)
		await expect(res.scan(unit('y'))).rejects.toThrow(/closed/)
	})

	it('validates units', async () => {
		const res = new ScanResponse(new PassThrough({ objectMode: true }))
		await expect(res.scan({ ...unit('x'), unitId: '' })).rejects.toThrow(TypeError)
		await expect(res.scan({ ...unit('x'), location: { ...unit('x').location, scanTarget: '' } })).rejects.toThrow(
			/scanTarget/
		)
		await expect(res.scan({ ...unit('x'), content: { encoding: 'latin1' as any, text: 'x' } })).rejects.toThrow(
			/encoding/
		)
	})

	it('writes state, keep-alive and config frames on the same stream', async () => {
		const sink = new PassThrough({ objectMode: true })
		const frames: RawResponse[] = []
		sink.on('data', (f) => frames.push(f))
		const res = new ScanResponse(sink)
		res.saveState({ targets: {} })
		res.keepAlive()
		res.patchConfig([])
		await tick()
		expect(frames.map((f) => f.type)).toEqual([ResponseType.State, ResponseType.KeepAlive, ResponseType.Config])
	})
})

/**
 * Like shim-js's StreamMessageOutTransform: write() is overridden and passes on only the chunk, so write callbacks
 * never fire. Backpressure still works, through write()'s return value and 'drain'.
 */
class CallbackDroppingTransform extends Transform {
	constructor() {
		super({ writableObjectMode: true })
	}

	override write(chunk: any): boolean {
		return super.write(chunk)
	}

	_transform(chunk: any, _: BufferEncoding, callback: TransformCallback) {
		this.push(Buffer.from(JSON.stringify(chunk)))
		callback()
	}
}

describe('ScanResponse on a stream that drops write callbacks', () => {
	const big = 'z'.repeat(1024 * 1024)

	it('keeps scanning far past the in-flight cap while the reader keeps up', async () => {
		const res = new CallbackDroppingTransform()
		let bytesOut = 0
		res.on('data', (c: Buffer) => (bytesOut += c.length))
		const scan = new ScanResponse(res)

		for (let i = 0; i < 24; i++) {
			await scan.scan(unit(big, { unitId: `u${i}` })) // 24 MiB in total, six times the 4 MiB cap
		}
		expect(bytesOut).toBeGreaterThan(24 * 1024 * 1024)
	}, 20000)

	it('waits while the reader is stalled and resumes when it reads again', async () => {
		const res = new CallbackDroppingTransform()
		const scan = new ScanResponse(res, { maxInFlightBytes: 4 * 1024 * 1024 })
		const pending: Promise<unknown>[] = []
		let resolved = 0

		// Nobody reads: the transform's readable side fills, then its writable side buffers the rest.
		const run = (async () => {
			for (let i = 0; i < 12; i++) {
				const p = scan.scan(unit(big, { unitId: `u${i}` }))
				pending.push(p)
				await p
				resolved++
			}
		})()
		await until(() => res.writableLength > 0) // the readable side is full and writes are buffering
		await settle()
		expect(resolved).toBeLessThan(12) // the cap holds the connector back

		res.on('data', () => {}) // the reader resumes
		await run
		expect(resolved).toBe(12)
	}, 20000)

	it('rejects a scan when the stream errors', async () => {
		const res = new CallbackDroppingTransform()
		const scan = new ScanResponse(res, { maxInFlightBytes: 1024 * 1024 })
		const p = (async () => {
			for (let i = 0; i < 8; i++) {
				await scan.scan(unit(big, { unitId: `u${i}` }))
			}
		})()
		await until(() => res.writableLength > 0)
		res.destroy(new Error('pipe broke'))
		await expect(p).rejects.toThrow('pipe broke')
	}, 20000)
})

describe('chunkUtf8', () => {
	it('returns the text unchanged when it fits', () => {
		expect(chunkUtf8('hello', 10, 2)).toEqual([{ text: 'hello', offset: 0 }])
	})

	it('never splits a multi-byte character and covers the whole text', () => {
		const text = '€'.repeat(5000) + '😀'.repeat(3000) + 'end'
		const chunks = chunkUtf8(text, 1024, 256)
		const buf = Buffer.from(text)
		for (const c of chunks) {
			expect(Buffer.byteLength(c.text)).toBeLessThanOrEqual(1024)
			expect(c.text.includes('�')).toBe(false)
			expect(Buffer.from(c.text).equals(buf.subarray(c.offset, c.offset + Buffer.byteLength(c.text)))).toBe(true)
		}
		const last = chunks[chunks.length - 1]
		expect(last.offset + Buffer.byteLength(last.text)).toBe(buf.length)
		for (let i = 1; i < chunks.length; i++) {
			const prevEnd = chunks[i - 1].offset + Buffer.byteLength(chunks[i - 1].text)
			expect(prevEnd - chunks[i].offset).toBeGreaterThanOrEqual(256) // never less than the requested overlap
			expect(chunks[i].offset).toBeGreaterThan(chunks[i - 1].offset) // and always advance
		}
	})

	it('rejects sizes that could not hold a character or would not advance', () => {
		expect(() => chunkUtf8('abcdef', 3, 0)).toThrow(RangeError)
		expect(() => chunkUtf8('abcdef', 8, 8)).toThrow(RangeError)
		expect(chunkUtf8('😀😀😀', 4, 0).map((c) => c.text)).toEqual(['😀', '😀', '😀'])
	})
})

describe('ScanResponse stream handling', () => {
	/** A stream that does not report how many objects it buffers. */
	class NoLengthTransform extends CallbackDroppingTransform {
		constructor() {
			super()
			Object.defineProperty(this, 'writableLength', { get: () => undefined })
		}
	}

	it('does not wait forever on a stream without writableLength', async () => {
		const res = new NoLengthTransform()
		res.on('data', () => {})
		const scan = new ScanResponse(res)
		for (let i = 0; i < 8; i++) {
			await scan.scan(unit('z'.repeat(1024 * 1024), { unitId: `u${i}` })) // twice the 4 MiB cap
		}
	}, 20000)

	it('rejects a pending scan when the stream is destroyed without a close event', async () => {
		const sink = new GatedSink(1)
		;(sink as any)._writableState.emitClose = false
		const res = new ScanResponse(sink)
		const p = res.scan(unit('x'))
		sink.destroy()
		await expect(p).rejects.toThrow(/closed/)
	})

	it('rejects scans and state after the stream ended', async () => {
		const sink = new PassThrough({ objectMode: true })
		sink.resume()
		const res = new ScanResponse(sink)
		sink.end()
		await expect(res.scan(unit('x'))).rejects.toThrow(/ended/)
		expect(() => res.saveState({})).toThrow(/ended/)
	})

	it('reports the stream error to saveState too', async () => {
		const sink = new PassThrough({ objectMode: true })
		const res = new ScanResponse(sink)
		sink.destroy(new Error('pipe broke'))
		await tick()
		expect(() => res.saveState({ targets: {} })).toThrow('pipe broke')
	})

	it('removes its listeners on dispose', () => {
		const sink = new PassThrough({ objectMode: true })
		const before = ['close', 'finish', 'error'].map((e) => sink.listenerCount(e))
		const res = new ScanResponse(sink)
		res.dispose()
		expect(['close', 'finish', 'error'].map((e) => sink.listenerCount(e))).toEqual(before)
	})

	it('skips binary units larger than a unit instead of sending one oversized frame', async () => {
		const sink = new GatedSink()
		const res = new ScanResponse(sink, { maxUnitBytes: 16384, extraction: { documents: true } })
		const text = 'A'.repeat(20000)
		const result = await res.scan(
			unit(text, { content: { encoding: 'base64', text }, mimeType: 'application/pdf' })
		)
		expect(result).toEqual({ accepted: false, chunks: 0, skipped: 'binaryTooLarge' })
		expect(sink.frames).toHaveLength(0)
	})

	it('sends only the unit fields of the frame contract', async () => {
		const sink = new PassThrough({ objectMode: true })
		const frames: RawResponse[] = []
		sink.on('data', (f) => frames.push(f))
		const res = new ScanResponse(sink)
		await res.scan({ ...unit('x'), raw: 'the whole record' } as any)
		expect(Object.keys(frames[0].data).sort()).toEqual([
			'chunk',
			'content',
			'location',
			'mimeType',
			'sizeBytes',
			'unitId',
		])
	})
})

describe('chunkUtf8 overlap', () => {
	it('keeps the full overlap when a boundary falls inside a multi-byte character', () => {
		const text = '😀'.repeat(20000) // 4-byte characters: most boundaries fall inside one
		const chunks = chunkUtf8(text, 16384, SCAN_CHUNK_OVERLAP_BYTES)
		for (let i = 1; i < chunks.length; i++) {
			const prevEnd = chunks[i - 1].offset + Buffer.byteLength(chunks[i - 1].text)
			expect(prevEnd - chunks[i].offset).toBeGreaterThanOrEqual(SCAN_CHUNK_OVERLAP_BYTES)
		}
	})
})
