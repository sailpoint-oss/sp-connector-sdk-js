/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { uniqueDatasetIds } from './dataset-ids'

describe('uniqueDatasetIds', () => {
	it('returns unique ids preserving first occurrence order', () => {
		expect(uniqueDatasetIds(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c'])
	})

	it('returns a copy when all ids are unique', () => {
		expect(uniqueDatasetIds(['dataset1', 'dataset2'])).toEqual(['dataset1', 'dataset2'])
	})

	it('returns empty array for empty input', () => {
		expect(uniqueDatasetIds([])).toEqual([])
	})

	it('normalizes ids to strings', () => {
		expect(uniqueDatasetIds(['1', 1 as unknown as string])).toEqual(['1'])
	})
})
