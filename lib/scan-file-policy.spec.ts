/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { classifyScanFile, scanFileSkipReason } from './scan-file-policy'
import * as sdk from './index'

describe('scan file policy', () => {
	it.each([
		['audio/mpeg', 'call.mp3', 'media'],
		['video/mp4', 'demo', 'media'],
		['application/octet-stream', 'WALKTHROUGH.MOV', 'media'],
		['application/typescript', 'index.ts', 'file'],
		['application/pdf', 'runbook.pdf', 'pdf'],
		['application/octet-stream', 'RUNBOOK.PDF', 'file'],
		['image/png', 'screenshot.png', 'image'],
		['image/svg+xml', 'diagram.svg', 'denylisted'],
		['text/xml', 'diagram.svg', 'file'],
		['image/webp', 'photo.webp', 'denylisted'],
		['image/png', 'photo.webp', 'image'],
		['application/vnd.ms-excel', 'budget.xls', 'file'],
		['', 'budget.xls', 'denylisted'],
		['application/octet-stream', 'budget.xls', 'denylisted'],
		['image/vnd.microsoft.icon', 'favicon.ico', 'image'],
		['image/x-icon', 'favicon.ico', 'image'],
		['text/plain', 'notes.txt', 'file'],
		['application/octet-stream', 'deploy.env', 'file'],
		['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'a.docx', 'file'],
		['application/zip', 'bundle.zip', 'file'],
		['message/rfc822', 'incident.eml', 'file'],
		['', '', 'file'],
	])('classifies %s %s as %s', (contentType, fileName, expected) => {
		expect(classifyScanFile(contentType, fileName)).toBe(expected)
	})

	it('sends every other file within the size cap', () => {
		expect(scanFileSkipReason('file', 10, 100)).toBeUndefined()
		expect(scanFileSkipReason('file', 100, 100)).toBeUndefined()
		expect(scanFileSkipReason('file', 101, 100)).toBe('oversize')
	})

	it('skips media, and PDFs and images unless extraction enables them', () => {
		expect(scanFileSkipReason('media', 10, 100, { documents: true, archives: true, pdf: true, ocr: true })).toBe(
			'policySkipped'
		)
		expect(scanFileSkipReason('pdf', 10, 100, { pdf: false })).toBe('pdfDisabled')
		expect(scanFileSkipReason('pdf', 10, 100, { pdf: true })).toBeUndefined()
		expect(scanFileSkipReason('image', 10, 100, {})).toBe('ocrDisabled')
		expect(scanFileSkipReason('image', 10, 100, { ocr: true })).toBeUndefined()
	})

	it('leaves the documents and archives switches to the runtime', () => {
		expect(scanFileSkipReason('file', 10, 100, { documents: false, archives: false })).toBeUndefined()
	})

	it('skips denylisted files whatever the extraction switches', () => {
		expect(
			scanFileSkipReason('denylisted', 10, 100, { documents: true, archives: true, pdf: true, ocr: true })
		).toBe('policySkipped')
	})

	it('reports the type before the size', () => {
		expect(scanFileSkipReason('pdf', 1000, 100)).toBe('pdfDisabled')
		expect(scanFileSkipReason('media', 1000, 100)).toBe('policySkipped')
	})

	it('is exported from the package', () => {
		expect(sdk.classifyScanFile).toBe(classifyScanFile)
		expect(sdk.scanFileSkipReason).toBe(scanFileSkipReason)
	})
})
