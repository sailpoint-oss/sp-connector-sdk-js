/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { StdSecretScanInput } from './commands/std-secret-scan'

/**
 * What kind of file a scan handler is looking at, from its MIME type and name. Only the kinds a connector can rule out
 * before downloading are told apart; every other file is `file`, and the runtime detects its format from its bytes.
 *
 * - `media`: audio or video, which never carries scannable text.
 * - `denylisted`: on the scanner's denylist (some image, icon and media formats) by both name and MIME type.
 * - `pdf` and `image`: read only when the command's `extraction.pdf` or `extraction.ocr` is on.
 */
export type ScanFileClass = 'media' | 'denylisted' | 'pdf' | 'image' | 'file'

/**
 * Why a file is not downloaded. Connectors count these in their state's coverage.
 */
export type ScanFileSkipReason = 'policySkipped' | 'pdfDisabled' | 'ocrDisabled' | 'oversize'

// Audio and video extensions, used only when the source reports no MIME type or a generic one. `ts` is left out: it is
// TypeScript far more often than MPEG-TS.
const MEDIA_EXTENSIONS = new Set([
	'mp3',
	'wav',
	'aac',
	'm4a',
	'flac',
	'ogg',
	'oga',
	'opus',
	'wma',
	'aif',
	'aiff',
	'mp4',
	'm4v',
	'mov',
	'avi',
	'mkv',
	'webm',
	'wmv',
	'flv',
	'mpg',
	'mpeg',
	'3gp',
])

// The scanner's denylist, the same lists the runtime's extraction policy applies. A file is denylisted when both its
// extension and its MIME type are listed; with only one of the two known, that one decides.
const DENYLIST_EXTENSIONS = new Set([
	'3gp',
	'aac',
	'apng',
	'avif',
	'bmp',
	'cur',
	'flac',
	'ico',
	'm4a',
	'm4p',
	'm4v',
	'mov',
	'mp3',
	'mp4',
	'mpeg',
	'mpg',
	'oga',
	'ogg',
	'ogv',
	'svg',
	'wav',
	'webm',
	'webp',
	'xls',
])

const DENYLIST_MIME_TYPES = new Set([
	'application/mp4',
	'audio/3gp2',
	'audio/3gpp',
	'audio/3gpp2',
	'audio/aac',
	'audio/flac',
	'audio/mp4',
	'audio/mpeg',
	'audio/ogg',
	'audio/wav',
	'audio/wave',
	'audio/webm',
	'audio/x-flac',
	'audio/x-pn-wav',
	'audio/x-wav',
	'image/apng',
	'image/avif',
	'image/svg+xml',
	'image/webp',
	'video/3gp2',
	'video/3gpp',
	'video/3gpp2',
	'video/mp4',
	'video/mpeg',
	'video/ogg',
	'video/quicktime',
	'video/webm',
])

const GENERIC_MIME_TYPES = new Set(['', 'application/octet-stream', 'binary/octet-stream', 'application/x-download'])

const extensionOf = (fileName: string): string => {
	const dot = fileName.lastIndexOf('.')
	return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

const isDenylisted = (mime: string, ext: string): boolean => {
	const extHit = ext !== '' && DENYLIST_EXTENSIONS.has(ext)
	const mimeHit = mime !== '' && DENYLIST_MIME_TYPES.has(mime)
	if (ext !== '' && mime !== '') {
		return extHit && mimeHit
	}
	return extHit || mimeHit
}

/**
 * Classifies a file from its MIME type and file name.
 *
 * Audio and video are recognised by MIME type, or by extension when the MIME type is missing or generic. The denylist
 * needs both name and type to agree, so a spreadsheet named `.xls` with an Excel MIME type is still scanned. PDFs and
 * images are recognised by MIME type only, so a file whose type the source does not report is sent and its bytes
 * decide.
 */
export const classifyScanFile = (contentType: string, fileName: string): ScanFileClass => {
	const mime = (contentType || '').toLowerCase().split(';')[0].trim()
	const ext = extensionOf(fileName || '')
	const generic = GENERIC_MIME_TYPES.has(mime)
	if (mime.startsWith('audio/') || mime.startsWith('video/') || (generic && MEDIA_EXTENSIONS.has(ext))) {
		return 'media'
	}
	if (isDenylisted(generic ? '' : mime, ext)) {
		return 'denylisted'
	}
	if (mime === 'application/pdf') {
		return 'pdf'
	}
	if (mime.startsWith('image/')) {
		return 'image'
	}
	return 'file'
}

/**
 * Returns why a file should not be downloaded, or undefined when it should be downloaded and sent to `scan()` as
 * base64. Call it with the file's metadata **before** downloading it. Only clear signals skip a file: media and the
 * denylist, a PDF or image while the command's `extraction.pdf` or `extraction.ocr` is off, and size. Everything else,
 * including text in any encoding, archives, email and office documents, is sent; the runtime detects the format and
 * applies the `documents` and `archives` switches itself.
 */
export const scanFileSkipReason = (
	fileClass: ScanFileClass,
	sizeBytes: number,
	maxBytes: number,
	extraction?: StdSecretScanInput['extraction']
): ScanFileSkipReason | undefined => {
	if (fileClass === 'media' || fileClass === 'denylisted') {
		return 'policySkipped'
	}
	if (fileClass === 'pdf' && !extraction?.pdf) {
		return 'pdfDisabled'
	}
	if (fileClass === 'image' && !extraction?.ocr) {
		return 'ocrDisabled'
	}
	if (sizeBytes > maxBytes) {
		return 'oversize'
	}
	return undefined
}
