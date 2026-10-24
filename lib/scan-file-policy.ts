/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { StdSecretScanInput } from './commands/std-secret-scan'

/**
 * What kind of file a scan handler is looking at, from its MIME type and name. Only the kinds a connector can rule out
 * before downloading are told apart; every other file is `file`, and the runtime detects its format from its bytes.
 */
export type ScanFileClass = 'media' | 'pdf' | 'image' | 'file'

/**
 * Why a file is not downloaded. Connectors count these in their state's coverage.
 */
export type ScanFileSkipReason = 'policySkipped' | 'pdfDisabled' | 'ocrDisabled' | 'oversize'

// Audio and video never carry scannable text. `ts` is left out: it is TypeScript far more often than MPEG-TS.
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

const extensionOf = (fileName: string): string => {
	const dot = fileName.lastIndexOf('.')
	return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

/**
 * Classifies a file from its MIME type and file name. Audio and video are recognised by MIME type or extension; PDFs
 * and images by MIME type only, so a file whose type the source does not report is sent and its bytes decide. SVG is
 * XML text, not a picture.
 */
export const classifyScanFile = (contentType: string, fileName: string): ScanFileClass => {
	const mime = (contentType || '').toLowerCase().split(';')[0].trim()
	if (mime.startsWith('audio/') || mime.startsWith('video/') || MEDIA_EXTENSIONS.has(extensionOf(fileName || ''))) {
		return 'media'
	}
	if (mime === 'application/pdf') {
		return 'pdf'
	}
	if (mime.startsWith('image/') && mime !== 'image/svg+xml') {
		return 'image'
	}
	return 'file'
}

/**
 * Returns why a file should not be downloaded, or undefined when it should be downloaded and sent to `scan()` as
 * base64. Call it with the file's metadata **before** downloading it. Only clear signals skip a file: media, a PDF or
 * image while the command's `extraction.pdf` or `extraction.ocr` is off, and size. Everything else, including text in
 * any encoding, archives, email and office documents, is sent; the runtime detects the format and applies the
 * `documents` and `archives` switches itself.
 */
export const scanFileSkipReason = (
	fileClass: ScanFileClass,
	sizeBytes: number,
	maxBytes: number,
	extraction?: StdSecretScanInput['extraction']
): ScanFileSkipReason | undefined => {
	if (fileClass === 'media') {
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
