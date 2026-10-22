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

/**
 * Split text into chunks of at most maxBytes UTF-8 bytes, each overlapping the previous one by at least overlapBytes.
 * Chunk edges never split a multi-byte character. Offsets are byte offsets into the original text.
 */
export function chunkUtf8(
	text: string,
	maxBytes: number,
	overlapBytes: number
): Array<{ text: string; offset: number }> {
	// A UTF-8 character is up to 4 bytes, so smaller chunks could not hold one; the overlap must leave room to advance.
	if (!Number.isInteger(maxBytes) || maxBytes < 4) {
		throw new RangeError(`maxBytes must be an integer of at least 4, got ${maxBytes}`)
	}
	if (!Number.isInteger(overlapBytes) || overlapBytes < 0 || overlapBytes >= maxBytes - 3) {
		throw new RangeError(`overlapBytes must be between 0 and maxBytes - 4, got ${overlapBytes}`)
	}
	const buf = Buffer.from(text, 'utf8')
	if (buf.length <= maxBytes) {
		return [{ text, offset: 0 }]
	}
	const isContinuation = (i: number) => i < buf.length && (buf[i] & 0xc0) === 0x80
	const chunks: Array<{ text: string; offset: number }> = []
	let start = 0
	for (;;) {
		let end = Math.min(start + maxBytes, buf.length)
		while (end > start && isContinuation(end)) {
			end--
		}
		chunks.push({ text: buf.toString('utf8', start, end), offset: start })
		if (end >= buf.length) {
			return chunks
		}
		// Step back to a character boundary so the overlap is never shorter than overlapBytes; step forward only if
		// that would not advance.
		let next = Math.max(end - overlapBytes, start + 1)
		while (next > start + 1 && isContinuation(next)) {
			next--
		}
		while (isContinuation(next)) {
			next++
		}
		start = next
	}
}
