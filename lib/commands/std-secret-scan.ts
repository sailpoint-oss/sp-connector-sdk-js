/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

/**
 * Which kinds of file the runtime extracts text from, and whether files are scanned at all. The platform sends the
 * complete object with every scan command. The runtime applies `documents`, `archives`, `pdf` and `ocr`; the SDK's
 * file helpers (`allowFile`, `ScanResponse.scanFile`) use `pdf`, `ocr` and `files` to skip files before they are
 * downloaded.
 */
export type ScanExtraction = {
	documents?: boolean
	archives?: boolean
	pdf?: boolean
	ocr?: boolean
	/** `false` when this scan must not read files at all, for example when the tenant is not licensed for them. */
	files?: boolean
}

/**
 * Input of std:secret-scan:full and std:secret-scan:delta.
 *
 * The platform always expands `scanTargets` to an explicit list and replaces `stateId` with the saved `state`,
 * so a connector sees the targets to scan and, for a delta, the state it saved last time. The rule pack is not part
 * of the input: the runtime loads it, and connectors never see it.
 */
export type StdSecretScanInput = {
	/** Version of this input contract. 1 is the current version; absent means 1. */
	contractVersion?: number
	scanTargets: string[]
	stateful: true
	state?: any
	maxUnitBytes?: number
	/** Largest file `scan()` and `scanFile()` send, in bytes. Default 10 MiB, at most 11 MiB. */
	maxBlobBytes?: number
	validation?: { enabled: boolean }
	extraction?: ScanExtraction
}

export type StdSecretScanFullInput = StdSecretScanInput

export type StdSecretScanDeltaInput = StdSecretScanInput & {
	lookbackDays?: number
	maxUnits?: number
}

export type ScanVisibility = 'public' | 'internal' | 'private' | 'external-shared'

/**
 * Where a scan unit came from. The detection stage copies it into the finding's location, so it must be enough to
 * point a person at the secret. It must not carry content.
 *
 * The fields describe an item in any kind of source (a record, a page, a file in a drive, a message):
 *
 * - `type`: a connector-defined kind of location, for example `EXAMPLE_ITEM` or `EXAMPLE_FILE`.
 * - `source`: the system scanned, for example `example-wiki`.
 * - `scanTarget`: the scan target the unit belongs to.
 * - `recordType` and `recordId`: the type of the item that holds the content and its id in the source.
 * - `field`: where in the item the content is, for example `body` or `files/<id>/<file name>`.
 * - `displayId`: a human-readable name of the item; `recordId` is shown when it is absent.
 * - `url`: a link to the item.
 * - `container`: what holds the item, for example a space, project or folder.
 *
 * `ScanResponse` truncates every string to the limits of the findings schema before sending it (`type` and `source` 64
 * characters, `recordType` 256, `recordId`, `displayId` and `container` 1024, `url` and `field` 2048, `owner.value`
 * 512).
 */
export type ScanUnitLocation = {
	type: string
	source: string
	scanTarget: string
	recordType: string
	recordId: string
	field: string
	displayId?: string
	url?: string
	container?: string
	visibility: ScanVisibility
	owner?: { type: 'email' | 'username'; value: string }
	modifiedAt?: string
}

/**
 * What a unit's content is: `text` the connector read as text, or `file`, the bytes of a file for the runtime to
 * extract text from. The runtime applies file scanning rules (the licence and the extraction switches) to `file` units.
 */
export type ScanContentKind = 'text' | 'file'

/**
 * A piece of customer content to scan. It is consumed by the runtime's detection stage inside the execution and never
 * leaves it. Chunking is done by `ScanResponse.scan()`, not by the connector.
 *
 * Text is sent as `utf8`. A file is sent as its raw bytes, preferably with `ScanResponse.scanFile()`, which applies the
 * file policy and encodes the bytes; `scan()` also takes a file as `base64` text, with the content type the source
 * reports as `mimeType`. The runtime extracts a file's text, and takes its file name from the last `/`-separated
 * segment of `location.field`.
 *
 * `content.kind` is optional: `scan()` sets `text` for `utf8` and `file` for `base64`. Set it to `file` for text that
 * is a file's content (a text file read by the connector), so it is scanned under the file rules.
 */
export type ScanUnit = {
	unitId: string
	location: ScanUnitLocation
	content: { encoding: 'utf8' | 'base64'; text: string; kind?: ScanContentKind }
	mimeType: string
	/** Informational. `scan()` computes the `sizeBytes` of each frame itself. */
	sizeBytes?: number
}

/**
 * A file to hand to `ScanResponse.scanFile()`, without its bytes.
 */
export type ScanFile = {
	unitId: string
	location: ScanUnitLocation
	/** The file name, used for the media and denylist rules. It is not sent: the runtime reads `location.field`. */
	name: string
	/** The content type the source reports. Defaults to `application/octet-stream`. */
	mimeType?: string
}

/**
 * The `data` of a scanUnit frame, as `ScanResponse` writes it for each chunk of a unit. The runtime's detection stage
 * reads it; connectors do not build it.
 *
 * `sizeBytes` is the size of this frame's content: the UTF-8 byte length of the chunk text, or the decoded byte length
 * of a base64 unit. A base64 unit is always one frame.
 */
export type ScanUnitFrame = {
	unitId: string
	location: ScanUnitLocation
	mimeType: string
	sizeBytes: number
	content: { encoding: 'utf8' | 'base64'; kind: ScanContentKind; text: string }
	chunk: { index: number; count: number; overlapBytes: number; offset: number }
}

/**
 * Why a file is not downloaded or not sent. Connectors count these in their state's coverage.
 *
 * - `policySkipped`: audio, video, or a file on the scanner's denylist.
 * - `pdfDisabled`, `ocrDisabled`: a PDF or an image while `extraction.pdf` or `extraction.ocr` is off.
 * - `oversize`: larger than `maxBlobBytes`.
 * - `unlicensed`: `extraction.files` is `false`, so no file is read.
 */
export type ScanFileSkipReason = 'policySkipped' | 'pdfDisabled' | 'ocrDisabled' | 'oversize' | 'unlicensed'

/** Why `scan()` or `scanFile()` did not send a unit. `scan()` itself only ever reports `oversize`. */
export type ScanSkipReason = ScanFileSkipReason

/**
 * Result of `ScanResponse.scan()` and `scanFile()`. A unit that is not accepted was not sent for scanning; the
 * connector should count it as skipped in the coverage it saves in its state, so a clean result is never mistaken for
 * full coverage.
 */
export type ScanResult = {
	accepted: boolean
	chunks: number
	skipped?: ScanSkipReason
}
