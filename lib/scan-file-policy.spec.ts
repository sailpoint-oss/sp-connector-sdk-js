/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { classifyScanFile, scanFileSkipReason } from './scan-file-policy'
import * as sdk from './index'

describe('scan file policy', () => {
	it.each([
		['text/plain', 'notes.txt', 'text'],
		['text/csv; charset=utf-8', 'export.csv', 'text'],
		['application/octet-stream', 'deploy.env', 'text'],
		['application/json', 'config', 'text'],
		['application/pdf', 'runbook.pdf', 'pdf'],
		['application/octet-stream', 'RUNBOOK.PDF', 'pdf'],
		['image/png', 'screenshot.png', 'image'],
		['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'a.docx', 'document'],
		['application/msword', 'a.doc', 'document'],
		['application/zip', 'bundle.zip', 'unsupported'],
		['', '', 'unsupported'],
	])('classifies %s %s as %s', (contentType, fileName, expected) => {
		expect(classifyScanFile(contentType, fileName)).toBe(expected)
	})

	it('always scans text within the size cap', () => {
		expect(scanFileSkipReason('text', 10, 100)).toBeUndefined()
		expect(scanFileSkipReason('text', 100, 100)).toBeUndefined()
		expect(scanFileSkipReason('text', 101, 100)).toBe('oversize')
	})

	it('scans documents, PDFs and images only when extraction enables them', () => {
		expect(scanFileSkipReason('document', 10, 100, { documents: false })).toBe('unsupportedType')
		expect(scanFileSkipReason('document', 10, 100, { documents: true })).toBeUndefined()
		expect(scanFileSkipReason('pdf', 10, 100, { pdf: false })).toBe('unsupportedType')
		expect(scanFileSkipReason('pdf', 10, 100, { pdf: true })).toBeUndefined()
		expect(scanFileSkipReason('image', 10, 100, {})).toBe('unsupportedType')
		expect(scanFileSkipReason('image', 10, 100, { ocr: true })).toBeUndefined()
		expect(scanFileSkipReason('unsupported', 10, 100, { documents: true, pdf: true, ocr: true })).toBe(
			'unsupportedType'
		)
	})

	it('reports an unsupported type before the size', () => {
		expect(scanFileSkipReason('pdf', 1000, 100)).toBe('unsupportedType')
	})

	it('is exported from the package', () => {
		expect(sdk.classifyScanFile).toBe(classifyScanFile)
		expect(sdk.scanFileSkipReason).toBe(scanFileSkipReason)
	})
})
