/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

// Internal to ScanResponse. This module is not exported from the package.

import type { ScanUnitLocation } from '../commands/std-secret-scan'

/**
 * The longest value the findings schema accepts for each location string, in characters. A finding whose location is
 * longer fails validation, so `ScanResponse` truncates before sending.
 */
const SCAN_LOCATION_LIMITS = {
	type: 64,
	source: 64,
	recordType: 256,
	recordId: 1024,
	displayId: 1024,
	url: 2048,
	field: 2048,
	container: 1024,
	ownerValue: 512,
} as const

/** Cuts a string to at most max code units, never between the two halves of a surrogate pair. */
const truncate = (value: string, max: number): string => {
	if (value.length <= max) {
		return value
	}
	const last = value.charCodeAt(max - 1)
	return value.slice(0, last >= 0xd800 && last <= 0xdbff ? max - 1 : max)
}

const bounded = <T extends string | undefined>(value: T, max: number): T =>
	(typeof value === 'string' ? truncate(value, max) : value) as T

/**
 * A copy of the location with every string within the schema's limits, built field by field so nothing else the
 * connector put on it is sent. Optional fields stay absent when they are.
 */
export const boundLocation = (location: ScanUnitLocation): ScanUnitLocation => {
	const limits = SCAN_LOCATION_LIMITS
	const result: ScanUnitLocation = {
		type: bounded(location.type, limits.type),
		source: bounded(location.source, limits.source),
		scanTarget: location.scanTarget,
		recordType: bounded(location.recordType, limits.recordType),
		recordId: bounded(location.recordId, limits.recordId),
		field: bounded(location.field, limits.field),
		visibility: location.visibility,
	}
	if (location.displayId !== undefined) {
		result.displayId = bounded(location.displayId, limits.displayId)
	}
	if (location.url !== undefined) {
		result.url = bounded(location.url, limits.url)
	}
	if (location.container !== undefined) {
		result.container = bounded(location.container, limits.container)
	}
	if (location.owner !== undefined) {
		result.owner = { type: location.owner.type, value: bounded(location.owner.value, limits.ownerValue) }
	}
	if (location.modifiedAt !== undefined) {
		result.modifiedAt = location.modifiedAt
	}
	return result
}
