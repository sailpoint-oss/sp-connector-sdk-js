/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { uniqueDatasetIds } from './dataset-ids'

describe('uniqueDatasetIds', () => {
	it('returns unique ids preserving first occurrence order', () => {
		expect(uniqueDatasetIds(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c'])
	})

	it('returns single id when all entries are duplicates', () => {
		expect(uniqueDatasetIds(['dataset1', 'dataset1', 'dataset1'])).toEqual(['dataset1'])
	})

	it('does not mutate the input array', () => {
		const input = ['a', 'b', 'a']
		const result = uniqueDatasetIds(input)

		expect(input).toEqual(['a', 'b', 'a'])
		expect(result).not.toBe(input)
	})

	it('returns a new array when all ids are unique', () => {
		const input = ['dataset1', 'dataset2']
		const result = uniqueDatasetIds(input)

		expect(result).toEqual(['dataset1', 'dataset2'])
		expect(result).not.toBe(input)
	})

	it('returns empty array for empty input', () => {
		expect(uniqueDatasetIds([])).toEqual([])
	})

	it('normalizes ids to strings', () => {
		expect(uniqueDatasetIds(['1', 1 as unknown as string])).toEqual(['1'])
	})
})
