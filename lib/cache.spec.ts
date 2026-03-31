/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { ConnectorCache, connectorCache, SDK_CACHE_PREFIX } from './cache'

describe('ConnectorCache', () => {
	let cache: ConnectorCache

	beforeEach(() => {
		cache = new ConnectorCache()
	})

	describe('get/set', () => {
		it('should store and retrieve a value', () => {
			cache.set('key', 'value')
			expect(cache.get('key')).toBe('value')
		})

		it('should return undefined for missing keys', () => {
			expect(cache.get('missing')).toBeUndefined()
		})

		it('should store objects', () => {
			const obj = { name: 'test', count: 42 }
			cache.set('obj', obj)
			expect(cache.get('obj')).toBe(obj)
		})

		it('should support generic types', () => {
			cache.set('num', 123)
			const val = cache.get<number>('num')
			expect(val).toBe(123)
		})

		it('should overwrite existing values', () => {
			cache.set('key', 'first')
			cache.set('key', 'second')
			expect(cache.get('key')).toBe('second')
		})
	})

	describe('TTL', () => {
		beforeEach(() => {
			jest.useFakeTimers()
		})

		afterEach(() => {
			jest.useRealTimers()
		})

		it('should return value before TTL expires', () => {
			cache.set('key', 'value', 60)
			jest.advanceTimersByTime(59000)
			expect(cache.get('key')).toBe('value')
		})

		it('should return undefined after TTL expires', () => {
			cache.set('key', 'value', 60)
			jest.advanceTimersByTime(60000)
			expect(cache.get('key')).toBeUndefined()
		})

		it('should evict expired entries on get', () => {
			cache.set('key', 'value', 1)
			expect(cache.size).toBe(1)
			jest.advanceTimersByTime(1000)
			cache.get('key')
			expect(cache.size).toBe(0)
		})

		it('should never expire when TTL is omitted', () => {
			cache.set('key', 'forever')
			jest.advanceTimersByTime(999999999)
			expect(cache.get('key')).toBe('forever')
		})
	})

	describe('has', () => {
		it('should return true for existing keys', () => {
			cache.set('key', 'value')
			expect(cache.has('key')).toBe(true)
		})

		it('should return false for missing keys', () => {
			expect(cache.has('missing')).toBe(false)
		})

		it('should return false for expired keys', () => {
			jest.useFakeTimers()
			cache.set('key', 'value', 1)
			jest.advanceTimersByTime(1000)
			expect(cache.has('key')).toBe(false)
			jest.useRealTimers()
		})
	})

	describe('delete', () => {
		it('should remove an existing key', () => {
			cache.set('key', 'value')
			expect(cache.delete('key')).toBe(true)
			expect(cache.get('key')).toBeUndefined()
		})

		it('should return false for missing keys', () => {
			expect(cache.delete('missing')).toBe(false)
		})
	})

	describe('clear', () => {
		it('should remove all user entries but preserve SDK entries', () => {
			cache.set('user-key', 'user-value')
			cache.set(`${SDK_CACHE_PREFIX}internal`, 'sdk-value')
			cache.clear()
			expect(cache.get('user-key')).toBeUndefined()
			expect(cache.get(`${SDK_CACHE_PREFIX}internal`)).toBe('sdk-value')
		})

		it('should remove everything when includeInternal is true', () => {
			cache.set('user-key', 'user-value')
			cache.set(`${SDK_CACHE_PREFIX}internal`, 'sdk-value')
			cache.clear(true)
			expect(cache.size).toBe(0)
		})
	})

	describe('size', () => {
		it('should return the number of entries', () => {
			expect(cache.size).toBe(0)
			cache.set('a', 1)
			cache.set('b', 2)
			expect(cache.size).toBe(2)
		})
	})

	describe('SDK reserved keys', () => {
		it('should allow internal SDK keys', () => {
			cache.set(`${SDK_CACHE_PREFIX}auth:token`, 'secret')
			expect(cache.get(`${SDK_CACHE_PREFIX}auth:token`)).toBe('secret')
		})
	})

	describe('singleton', () => {
		it('should export a module-level singleton', () => {
			expect(connectorCache).toBeInstanceOf(ConnectorCache)
		})
	})
})
