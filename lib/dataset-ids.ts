/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

/**
 * Returns unique dataset IDs while preserving the order of first occurrence.
 * Connectors may receive duplicate dataset IDs when a spec defines multiple
 * dataset entries with the same id (for example machine-identity and resource links).
 */
export const uniqueDatasetIds = (datasetIds: string[]): string[] => {
	const seen = new Set<string>()
	const uniqueIds: string[] = []

	for (const datasetId of datasetIds) {
		const normalizedId = String(datasetId)
		if (seen.has(normalizedId)) {
			continue
		}
		seen.add(normalizedId)
		uniqueIds.push(normalizedId)
	}

	return uniqueIds
}
