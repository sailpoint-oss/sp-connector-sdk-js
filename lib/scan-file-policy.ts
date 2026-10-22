/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { StdSecretScanInput } from './commands/std-secret-scan'

/**
 * What kind of file a scan handler is looking at, from its MIME type and name.
 */
export type ScanFileClass = 'text' | 'document' | 'pdf' | 'image' | 'unsupported'

/**
 * Why a file is not scanned. Connectors count these in their state's coverage.
 */
export type ScanFileSkipReason = 'unsupportedType' | 'oversize'

const TEXT_MIME_TYPES = new Set([
	'application/json',
	'application/xml',
	'application/javascript',
	'application/x-yaml',
	'application/yaml',
	'application/x-sh',
	'application/sql',
	'application/x-pem-file',
])

const TEXT_EXTENSIONS = new Set([
	'txt',
	'log',
	'csv',
	'json',
	'xml',
	'yaml',
	'yml',
	'ini',
	'conf',
	'cfg',
	'properties',
	'env',
	'sh',
	'ps1',
	'py',
	'js',
	'ts',
	'sql',
	'pem',
	'key',
	'md',
	'html',
	'htm',
])

const DOCUMENT_EXTENSIONS = new Set(['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'doc', 'xls', 'ppt', 'rtf'])

const extensionOf = (fileName: string): string => {
	const dot = fileName.lastIndexOf('.')
	return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

/**
 * Classifies a file from its MIME type and file name. A text MIME type or a text extension wins, so a `.env` file
 * served as `application/octet-stream` is still scanned.
 */
export const classifyScanFile = (contentType: string, fileName: string): ScanFileClass => {
	const mime = (contentType || '').toLowerCase().split(';')[0].trim()
	const extension = extensionOf(fileName || '')
	if (mime.startsWith('text/') || TEXT_MIME_TYPES.has(mime) || TEXT_EXTENSIONS.has(extension)) {
		return 'text'
	}
	if (mime === 'application/pdf' || extension === 'pdf') {
		return 'pdf'
	}
	if (mime.startsWith('image/')) {
		return 'image'
	}
	if (
		mime.startsWith('application/vnd.openxmlformats-officedocument') ||
		mime.startsWith('application/vnd.oasis.opendocument') ||
		mime === 'application/msword' ||
		mime === 'application/vnd.ms-excel' ||
		mime === 'application/vnd.ms-powerpoint' ||
		mime === 'application/rtf' ||
		DOCUMENT_EXTENSIONS.has(extension)
	) {
		return 'document'
	}
	return 'unsupported'
}

/**
 * Returns why a file should not be scanned, or undefined when it should be. Call it with the file's metadata
 * **before** downloading it, so files that would be dropped are never fetched. Documents, PDFs and images are only
 * scanned when the command's `extraction` input enables them.
 */
export const scanFileSkipReason = (
	fileClass: ScanFileClass,
	sizeBytes: number,
	maxBytes: number,
	extraction?: StdSecretScanInput['extraction']
): ScanFileSkipReason | undefined => {
	const enabled: Record<ScanFileClass, boolean> = {
		text: true,
		document: Boolean(extraction?.documents),
		pdf: Boolean(extraction?.pdf),
		image: Boolean(extraction?.ocr),
		unsupported: false,
	}
	if (!enabled[fileClass]) {
		return 'unsupportedType'
	}
	if (sizeBytes > maxBytes) {
		return 'oversize'
	}
	return undefined
}
