/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */
import { SimpleKey, CompoundKey, KeyID, KeyLookupID, KeyUniqueID } from './command'

describe('simpleKey', () => {
	it('builds key correctly', () => {
		expect(SimpleKey('123')).toStrictEqual({ simple: { id: '123' } })
	})

	it('throws exception with wrong key type', () => {
		expect(() => KeyID({ key: { compound: { lookupId: '123', uniqueId: '456' } } })).toThrow()
	})

	it('extracts id correctly', () => {
		expect(KeyID({ key: { simple: { id: '123' } } })).toStrictEqual('123')
	})
})

describe('compoundKey', () => {
	it('builds key correctly', () => {
		expect(CompoundKey('123', '456')).toStrictEqual({ compound: { lookupId: '123', uniqueId: '456' } })
	})

	it('extracts lookup id correctly', () => {
		expect(KeyLookupID({ key: { compound: { lookupId: '123', uniqueId: '456' } } })).toStrictEqual('123')
	})

	it('throws exception with wrong key type', () => {
		expect(() => KeyLookupID({ key: { simple: { id: '123' } } })).toThrow()
	})

	it('throws exception with wrong key type', () => {
		expect(() => KeyUniqueID({ key: { simple: { id: '123' } } })).toThrow()
	})

	it('extracts unique id correctly', () => {
		expect(KeyUniqueID({ key: { compound: { lookupId: '123', uniqueId: '456' } } })).toStrictEqual('456')
	})
})
