/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

/**
 * Input of std:secret-scan:full and std:secret-scan:delta.
 *
 * sp-connect always expands `scanTargets` to an explicit list and replaces `stateId` with the saved `state`,
 * so a connector sees the targets to scan and, for a delta, the state it saved last time. The rule pack is not part
 * of the input: the runtime loads it, and connectors never see it.
 */
export type StdSecretScanInput = {
	scanTargets: string[]
	stateful: true
	state?: any
	maxUnitBytes?: number
	/** Largest binary unit `scan()` sends, in decoded bytes. Default 10 MiB, at most 11 MiB. */
	maxBlobBytes?: number
	validation?: { enabled: boolean }
	/**
	 * Which kinds of file the runtime extracts text from. The runtime applies these switches; connectors use `pdf` and
	 * `ocr` only to skip PDFs and images before downloading them.
	 */
	extraction?: { documents?: boolean; archives?: boolean; pdf?: boolean; ocr?: boolean }
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
 */
export type ScanUnitLocation = {
	type: string
	source: string
	scanTarget: string
	recordType: string
	recordId: string
	field: string
	displayId: string
	url?: string
	container?: string
	visibility: ScanVisibility
	owner?: { type: 'email' | 'username'; value: string }
	modifiedAt?: string
}

/**
 * A piece of customer content to scan. It is consumed by the runtime's detection stage inside the execution and never
 * leaves it. Chunking is done by `ScanResponse.scan()`, not by the connector.
 *
 * Text is sent as `utf8`. A file is sent as its raw bytes in `base64`, with the content type the source reports as
 * `mimeType`; the runtime extracts its text. For a file, the runtime takes the file name from the last `/`-separated
 * segment of `location.field`.
 */
export type ScanUnit = {
	unitId: string
	location: ScanUnitLocation
	content: { encoding: 'utf8' | 'base64'; text: string }
	mimeType: string
	/** Informational. `scan()` computes the `sizeBytes` of each frame itself. */
	sizeBytes?: number
}

/**
 * The `data` of a scanUnit frame, as `ScanResponse.scan()` writes it for each chunk of a unit. The runtime's detection
 * stage reads it; connectors do not build it.
 *
 * `sizeBytes` is the size of this frame's content: the UTF-8 byte length of the chunk text, or the decoded byte length
 * of a base64 unit. A base64 unit is always one frame.
 */
export type ScanUnitFrame = {
	unitId: string
	location: ScanUnitLocation
	mimeType: string
	sizeBytes: number
	content: { encoding: 'utf8' | 'base64'; text: string }
	chunk: { index: number; count: number; overlapBytes: number; offset: number }
}

/** `oversize`: a base64 unit larger than `maxBlobBytes` once decoded. */
export type ScanSkipReason = 'oversize'

/**
 * Result of `ScanResponse.scan()`. A unit that is not accepted was not sent for scanning; the connector should count
 * it as skipped in the coverage it saves in its state, so a clean result is never mistaken for full coverage.
 */
export type ScanResult = {
	accepted: boolean
	chunks: number
	skipped?: ScanSkipReason
}
