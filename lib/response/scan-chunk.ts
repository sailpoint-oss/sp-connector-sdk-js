/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

// Internal to ScanResponse. This module is not exported from the package.

/** Default and maximum size of one scan unit chunk, in UTF-8 bytes (the `maxUnitBytes` input). */
export const MAX_SCAN_UNIT_BYTES = 1024 * 1024
/** Smallest allowed `maxUnitBytes`. It keeps the full SCAN_CHUNK_OVERLAP_BYTES overlap (a quarter of the unit). */
export const MIN_SCAN_UNIT_BYTES = 16 * 1024
/**
 * Overlap between consecutive chunks of one unit, in bytes. It must be at least as long as the longest secret the
 * detector matches, so a secret that spans a chunk boundary is still found whole in one chunk.
 */
export const SCAN_CHUNK_OVERLAP_BYTES = 4096
/** Default cap on scan bytes written but not yet taken by the stream, per command. */
export const DEFAULT_MAX_IN_FLIGHT_SCAN_BYTES = 4 * 1024 * 1024

/** One chunk of a text unit: its text, and its UTF-8 byte offset and length in the whole text. */
export type Utf8Chunk = { text: string; offset: number; sizeBytes: number }

/**
 * UTF-8 length of the character starting at code unit i: 1 to 3 bytes, or 4 for a surrogate pair (two code units). A
 * lone surrogate counts 3 bytes, the length of the U+FFFD that replaces it when the text is encoded.
 */
const charBytes = (text: string, i: number): number => {
	const c = text.charCodeAt(i)
	if (c < 0x80) {
		return 1
	}
	if (c < 0x800) {
		return 2
	}
	if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
		const next = text.charCodeAt(i + 1)
		if (next >= 0xdc00 && next <= 0xdfff) {
			return 4
		}
	}
	return 3
}

/** Whether code unit i is the second half of a surrogate pair, so no chunk can start or end before it. */
const isLowSurrogateOfPair = (text: string, i: number): boolean => {
	if (i <= 0 || i >= text.length) {
		return false
	}
	const c = text.charCodeAt(i)
	const prev = text.charCodeAt(i - 1)
	return c >= 0xdc00 && c <= 0xdfff && prev >= 0xd800 && prev <= 0xdbff
}

type Span = { start: number; end: number; offset: number; sizeBytes: number }

/**
 * Chunk boundaries, in code units and UTF-8 bytes, computed by walking the string: the text is never encoded or
 * copied. The rules are those of a split of the encoded bytes: at most maxBytes per chunk, never splitting a
 * character, and each chunk starting at least overlapBytes before the end of the previous one when it can.
 */
function* spans(text: string, maxBytes: number, overlapBytes: number): Generator<Span> {
	let start = 0 // code unit
	let offset = 0 // byte offset of start
	for (;;) {
		let end = start
		let bytes = 0
		while (end < text.length) {
			const n = charBytes(text, end)
			if (bytes + n > maxBytes) {
				break
			}
			bytes += n
			end += n === 4 ? 2 : 1
		}
		yield { start, end, offset, sizeBytes: bytes }
		if (end >= text.length) {
			return
		}
		// Step back from the end, a character at a time, until the overlap is at least overlapBytes; never back to the
		// chunk's own start, so the next chunk always advances by at least one character. back is the byte length
		// between the next start and this chunk's end.
		let next = end
		let back = 0
		while (back < overlapBytes) {
			let prev = next - 1
			if (isLowSurrogateOfPair(text, prev)) {
				prev--
			}
			if (prev <= start) {
				break
			}
			back += charBytes(text, prev)
			next = prev
		}
		offset += bytes - back
		start = next
	}
}

/**
 * Split text into chunks of at most maxBytes UTF-8 bytes, each overlapping the previous one by at least overlapBytes.
 * Chunk edges never split a multi-byte character. Offsets are byte offsets into the original text.
 *
 * Chunks are produced one at a time, as substrings of the text: neither the encoded text nor a list of every chunk is
 * held in memory. `countUtf8Chunks` says how many there will be, without building them.
 */
export function* chunkUtf8(text: string, maxBytes: number, overlapBytes: number): Generator<Utf8Chunk> {
	checkChunkSizes(maxBytes, overlapBytes)
	const total = Buffer.byteLength(text, 'utf8')
	if (total <= maxBytes) {
		yield { text, offset: 0, sizeBytes: total }
		return
	}
	for (const span of spans(text, maxBytes, overlapBytes)) {
		yield { text: text.slice(span.start, span.end), offset: span.offset, sizeBytes: span.sizeBytes }
	}
}

/** How many chunks `chunkUtf8` yields for the same arguments. */
export function countUtf8Chunks(text: string, maxBytes: number, overlapBytes: number): number {
	checkChunkSizes(maxBytes, overlapBytes)
	if (Buffer.byteLength(text, 'utf8') <= maxBytes) {
		return 1
	}
	let count = 0
	for (const _ of spans(text, maxBytes, overlapBytes)) {
		count++
	}
	return count
}

function checkChunkSizes(maxBytes: number, overlapBytes: number): void {
	// A UTF-8 character is up to 4 bytes, so smaller chunks could not hold one; the overlap must leave room to advance.
	if (!Number.isInteger(maxBytes) || maxBytes < 4) {
		throw new RangeError(`maxBytes must be an integer of at least 4, got ${maxBytes}`)
	}
	if (!Number.isInteger(overlapBytes) || overlapBytes < 0 || overlapBytes >= maxBytes - 3) {
		throw new RangeError(`overlapBytes must be between 0 and maxBytes - 4, got ${overlapBytes}`)
	}
}
