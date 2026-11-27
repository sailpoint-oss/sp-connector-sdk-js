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
	validation?: { enabled: boolean }
	extraction?: { documents?: boolean; pdf?: boolean; ocr?: boolean }
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
 */
export type ScanUnit = {
	unitId: string
	location: ScanUnitLocation
	content: { encoding: 'utf8' | 'base64'; text: string }
	mimeType: string
	sizeBytes?: number
}

/**
 * The `data` of a scanUnit frame, as `ScanResponse.scan()` writes it for each chunk of a unit. The runtime's detection
 * stage reads it; connectors do not build it.
 */
export type ScanUnitFrame = {
	unitId: string
	location: ScanUnitLocation
	mimeType: string
	sizeBytes: number
	content: { encoding: 'utf8' | 'base64'; text: string }
	chunk: { index: number; count: number; overlapBytes: number; offset: number }
}

export type ScanSkipReason = 'binaryNotExtracted' | 'binaryTooLarge'

/**
 * Result of `ScanResponse.scan()`. A unit that is not accepted was not sent for scanning; the connector should count
 * it as skipped in the coverage it saves in its state, so a clean result is never mistaken for full coverage.
 */
export type ScanResult = {
	accepted: boolean
	chunks: number
	skipped?: ScanSkipReason
}
