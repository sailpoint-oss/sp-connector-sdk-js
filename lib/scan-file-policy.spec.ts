/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { allowFile, classifyScanFile, scanBlobLimit } from './scan-file-policy'
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
		['message/rfc822', 'message.eml', 'file'],
		['', '', 'file'],
	])('classifies %s %s as %s', (contentType, fileName, expected) => {
		expect(classifyScanFile(contentType, fileName)).toBe(expected)
	})

	const skipped = (name: string, mime: string, size: number | undefined, extraction?: any, max?: number) => {
		const decision = allowFile(name, mime, size, extraction, max)
		return decision.allow ? undefined : decision.reason
	}

	it('sends every other file within the size cap', () => {
		expect(allowFile('notes.txt', 'text/plain', 10, {}, 100)).toEqual({ allow: true })
		expect(skipped('notes.txt', 'text/plain', 100, {}, 100)).toBeUndefined()
		expect(skipped('notes.txt', 'text/plain', 101, {}, 100)).toBe('oversize')
	})

	it('does not check a size the source does not report', () => {
		expect(skipped('notes.txt', 'text/plain', undefined, {}, 100)).toBeUndefined()
		expect(skipped('notes.txt', 'text/plain', NaN, {}, 100)).toBeUndefined()
	})

	it('skips media, and PDFs and images unless extraction enables them', () => {
		const all = { documents: true, archives: true, pdf: true, ocr: true }
		expect(skipped('call.mp3', 'audio/mpeg', 10, all, 100)).toBe('policySkipped')
		expect(skipped('runbook.pdf', 'application/pdf', 10, { pdf: false }, 100)).toBe('pdfDisabled')
		expect(skipped('runbook.pdf', 'application/pdf', 10, { pdf: true }, 100)).toBeUndefined()
		expect(skipped('scan.png', 'image/png', 10, {}, 100)).toBe('ocrDisabled')
		expect(skipped('scan.png', 'image/png', 10, { ocr: true }, 100)).toBeUndefined()
		expect(skipped('runbook.pdf', 'application/pdf', 10, undefined, 100)).toBe('pdfDisabled')
	})

	it('leaves the documents and archives switches to the runtime', () => {
		expect(skipped('a.docx', 'application/zip', 10, { documents: false, archives: false }, 100)).toBeUndefined()
	})

	it('skips denylisted files whatever the extraction switches', () => {
		expect(skipped('photo.webp', 'image/webp', 10, { documents: true, archives: true, pdf: true, ocr: true }, 100)).toBe(
			'policySkipped'
		)
	})

	it('refuses every file when files is false, before any other rule', () => {
		expect(skipped('notes.txt', 'text/plain', 10, { files: false }, 100)).toBe('unlicensed')
		expect(skipped('call.mp3', 'audio/mpeg', 1000, { files: false, pdf: true }, 100)).toBe('unlicensed')
		expect(skipped('notes.txt', 'text/plain', 10, { files: true }, 100)).toBeUndefined()
	})

	it('reports the type before the size', () => {
		expect(skipped('runbook.pdf', 'application/pdf', 1000, {}, 100)).toBe('pdfDisabled')
		expect(skipped('call.mp3', 'audio/mpeg', 1000, {}, 100)).toBe('policySkipped')
	})

	it('defaults the size limit to 10 MiB and caps it at 11 MiB', () => {
		const MiB = 1024 * 1024
		expect(scanBlobLimit()).toBe(10 * MiB)
		expect(scanBlobLimit(0)).toBe(10 * MiB)
		expect(scanBlobLimit(-5)).toBe(10 * MiB)
		expect(scanBlobLimit(1000.7)).toBe(1000)
		expect(scanBlobLimit(64 * MiB)).toBe(11 * MiB)
		expect(skipped('a.txt', 'text/plain', 10 * MiB + 1)).toBe('oversize')
		expect(skipped('a.txt', 'text/plain', 10 * MiB)).toBeUndefined()
	})

	it('is exported from the package', () => {
		expect(sdk.classifyScanFile).toBe(classifyScanFile)
		expect(sdk.allowFile).toBe(allowFile)
		expect(sdk.scanBlobLimit).toBe(scanBlobLimit)
	})
})
