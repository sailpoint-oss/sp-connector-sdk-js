/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { ConnectorDataStore, createConnectorDataStore } from './data-store'
import { PatchOp, Response } from './response'

function mockResponse(): Response<any> {
	return {
		send: jest.fn(),
		saveState: jest.fn(),
		keepAlive: jest.fn(),
		patchConfig: jest.fn(),
	}
}

describe('ConnectorDataStore', () => {
	describe('get', () => {
		it('should read from connectorAttributes', () => {
			const config = { connectorAttributes: { lastSync: '2026-01-01' } }
			const store = createConnectorDataStore(config, mockResponse())

			expect(store.get('lastSync')).toBe('2026-01-01')
		})

		it('should return undefined for missing keys', () => {
			const config = { connectorAttributes: {} }
			const store = createConnectorDataStore(config, mockResponse())

			expect(store.get('missing')).toBeUndefined()
		})

		it('should return undefined when connectorAttributes is missing', () => {
			const config = {}
			const store = createConnectorDataStore(config, mockResponse())

			expect(store.get('anything')).toBeUndefined()
		})

		it('should return pending value if set', () => {
			const config = { connectorAttributes: { key: 'old' } }
			const store = createConnectorDataStore(config, mockResponse())

			store.set('key', 'new')
			expect(store.get('key')).toBe('new')
		})

		it('should return undefined for pending deletes', () => {
			const config = { connectorAttributes: { key: 'value' } }
			const store = createConnectorDataStore(config, mockResponse())

			store.delete('key')
			expect(store.get('key')).toBeUndefined()
		})

		it('should support generic types', () => {
			const config = { connectorAttributes: { count: 42 } }
			const store = createConnectorDataStore(config, mockResponse())

			const val = store.get<number>('count')
			expect(val).toBe(42)
		})
	})

	describe('set', () => {
		it('should buffer changes without calling patchConfig', () => {
			const res = mockResponse()
			const config = { connectorAttributes: {} }
			const store = createConnectorDataStore(config, res)

			store.set('key', 'value')
			expect(res.patchConfig).not.toHaveBeenCalled()
		})

		it('should skip if value is identical to current (primitive)', () => {
			const config = { connectorAttributes: { key: 'same' } }
			const store = createConnectorDataStore(config, mockResponse())

			store.set('key', 'same')
			expect(store.hasPendingChanges).toBe(false)
		})

		it('should skip if value is identical to current (object)', () => {
			const config = { connectorAttributes: { data: { a: 1, b: 2 } } }
			const store = createConnectorDataStore(config, mockResponse())

			store.set('data', { a: 1, b: 2 })
			expect(store.hasPendingChanges).toBe(false)
		})

		it('should detect changes in objects', () => {
			const config = { connectorAttributes: { data: { a: 1 } } }
			const store = createConnectorDataStore(config, mockResponse())

			store.set('data', { a: 2 })
			expect(store.hasPendingChanges).toBe(true)
		})

		it('should remove pending entry if set back to original value', () => {
			const config = { connectorAttributes: { key: 'original' } }
			const store = createConnectorDataStore(config, mockResponse())

			store.set('key', 'changed')
			expect(store.hasPendingChanges).toBe(true)

			store.set('key', 'original')
			expect(store.hasPendingChanges).toBe(false)
		})
	})

	describe('delete', () => {
		it('should buffer a delete for existing keys', () => {
			const config = { connectorAttributes: { key: 'value' } }
			const store = createConnectorDataStore(config, mockResponse())

			store.delete('key')
			expect(store.hasPendingChanges).toBe(true)
		})

		it('should not buffer a delete for keys that do not exist', () => {
			const config = { connectorAttributes: {} }
			const store = createConnectorDataStore(config, mockResponse())

			store.delete('missing')
			expect(store.hasPendingChanges).toBe(false)
		})

		it('should buffer a delete for a key that was pending set', () => {
			const config = {}
			const store = createConnectorDataStore(config, mockResponse())

			store.set('key', 'new-value')
			store.delete('key')
			expect(store.hasPendingChanges).toBe(true)
		})
	})

	describe('reload', () => {
		function mockContext(freshConfig: any) {
			return { reloadConfig: jest.fn().mockResolvedValue(freshConfig) } as any
		}

		it('should update the config baseline from context.reloadConfig', async () => {
			const config = { connectorAttributes: { key: 'old' } }
			const store = createConnectorDataStore(config, mockResponse())

			const context = mockContext({ connectorAttributes: { key: 'new' } })
			await store.reload(context)

			expect(store.get('key')).toBe('new')
			expect(context.reloadConfig).toHaveBeenCalledTimes(1)
		})

		it('should preserve pending changes across a reload', async () => {
			const config = { connectorAttributes: {} }
			const store = createConnectorDataStore(config, mockResponse())

			store.set('pending', 'value')

			const context = mockContext({ connectorAttributes: { other: 'from-isc' } })
			await store.reload(context)

			// Pending change is still there
			expect(store.get('pending')).toBe('value')
			expect(store.hasPendingChanges).toBe(true)
		})

		it('should use reloaded config for change detection after reload', async () => {
			const config = { connectorAttributes: {} }
			const store = createConnectorDataStore(config, mockResponse())

			// After reload, 'key' now exists with 'value' in ISC
			const context = mockContext({ connectorAttributes: { key: 'value' } })
			await store.reload(context)

			// Setting to the same value should be a no-op
			store.set('key', 'value')
			expect(store.hasPendingChanges).toBe(false)
		})
	})

	describe('flush', () => {
		it('should send Add patches for new keys', () => {
			const res = mockResponse()
			const config = { connectorAttributes: {} }
			const store = createConnectorDataStore(config, res)

			store.set('newKey', 'newValue')
			store.flush()

			expect(res.patchConfig).toHaveBeenCalledWith([
				{ op: PatchOp.Add, path: '/connectorAttributes/newKey', value: 'newValue' },
			])
		})

		it('should send Replace patches for existing keys', () => {
			const res = mockResponse()
			const config = { connectorAttributes: { existing: 'old' } }
			const store = createConnectorDataStore(config, res)

			store.set('existing', 'updated')
			store.flush()

			expect(res.patchConfig).toHaveBeenCalledWith([
				{ op: PatchOp.Replace, path: '/connectorAttributes/existing', value: 'updated' },
			])
		})

		it('should send Remove patches for deleted keys', () => {
			const res = mockResponse()
			const config = { connectorAttributes: { toRemove: 'value' } }
			const store = createConnectorDataStore(config, res)

			store.delete('toRemove')
			store.flush()

			expect(res.patchConfig).toHaveBeenCalledWith([
				{ op: PatchOp.Remove, path: '/connectorAttributes/toRemove' },
			])
		})

		it('should batch multiple changes into a single patchConfig call', () => {
			const res = mockResponse()
			const config = { connectorAttributes: { existing: 'old', toRemove: 'bye' } }
			const store = createConnectorDataStore(config, res)

			store.set('existing', 'updated')
			store.set('brand-new', 123)
			store.delete('toRemove')
			store.flush()

			expect(res.patchConfig).toHaveBeenCalledTimes(1)
			const patches = (res.patchConfig as jest.Mock).mock.calls[0][0]
			expect(patches).toHaveLength(3)
			expect(patches).toContainEqual({
				op: PatchOp.Replace,
				path: '/connectorAttributes/existing',
				value: 'updated',
			})
			expect(patches).toContainEqual({
				op: PatchOp.Add,
				path: '/connectorAttributes/brand-new',
				value: 123,
			})
			expect(patches).toContainEqual({
				op: PatchOp.Remove,
				path: '/connectorAttributes/toRemove',
			})
		})

		it('should not call patchConfig when there are no changes', () => {
			const res = mockResponse()
			const config = { connectorAttributes: { key: 'value' } }
			const store = createConnectorDataStore(config, res)

			store.set('key', 'value') // same value, no change
			store.flush()

			expect(res.patchConfig).not.toHaveBeenCalled()
		})

		it('should clear pending changes after flush', () => {
			const res = mockResponse()
			const config = { connectorAttributes: {} }
			const store = createConnectorDataStore(config, res)

			store.set('key', 'value')
			store.flush()
			expect(store.hasPendingChanges).toBe(false)

			// Second flush should be a no-op
			store.flush()
			expect(res.patchConfig).toHaveBeenCalledTimes(1)
		})

		it('should update local config after flush so subsequent set() calls detect no change', () => {
			const res = mockResponse()
			const config = { connectorAttributes: {} }
			const store = createConnectorDataStore(config, res)

			store.set('key', 'value')
			store.flush()

			// Second flush with the same value should be a no-op — baseline was updated
			store.set('key', 'value')
			expect(store.hasPendingChanges).toBe(false)
			store.flush()
			expect(res.patchConfig).toHaveBeenCalledTimes(1)
		})

		it('should update local config after flush so Replace is used instead of Add on second write', () => {
			const res = mockResponse()
			const config = { connectorAttributes: {} }
			const store = createConnectorDataStore(config, res)

			store.set('key', 'first')
			store.flush()

			store.set('key', 'second')
			store.flush()

			const firstPatches = (res.patchConfig as jest.Mock).mock.calls[0][0]
			const secondPatches = (res.patchConfig as jest.Mock).mock.calls[1][0]
			expect(firstPatches[0].op).toBe(PatchOp.Add)
			expect(secondPatches[0].op).toBe(PatchOp.Replace)
		})

		it('should update local config after flush so deleted keys are gone from baseline', () => {
			const res = mockResponse()
			const config = { connectorAttributes: { key: 'value' } }
			const store = createConnectorDataStore(config, res)

			store.delete('key')
			store.flush()

			// key no longer exists in baseline, so a second delete is a no-op
			store.delete('key')
			expect(store.hasPendingChanges).toBe(false)
		})

		it('should handle config with no connectorAttributes (all adds)', () => {
			const res = mockResponse()
			const config = {}
			const store = createConnectorDataStore(config, res)

			store.set('key', 'value')
			store.flush()

			expect(res.patchConfig).toHaveBeenCalledWith([
				{ op: PatchOp.Add, path: '/connectorAttributes/key', value: 'value' },
			])
		})

		it('should handle complex values (objects, arrays)', () => {
			const res = mockResponse()
			const config = { connectorAttributes: {} }
			const store = createConnectorDataStore(config, res)

			store.set('metadata', { users: ['a', 'b'], cursor: { page: 2, token: 'abc' } })
			store.flush()

			expect(res.patchConfig).toHaveBeenCalledWith([
				{
					op: PatchOp.Add,
					path: '/connectorAttributes/metadata',
					value: { users: ['a', 'b'], cursor: { page: 2, token: 'abc' } },
				},
			])
		})
	})

	describe('hasPendingChanges', () => {
		it('should be false initially', () => {
			const store = createConnectorDataStore({}, mockResponse())
			expect(store.hasPendingChanges).toBe(false)
		})

		it('should be true after set', () => {
			const store = createConnectorDataStore({}, mockResponse())
			store.set('key', 'value')
			expect(store.hasPendingChanges).toBe(true)
		})

		it('should be false after flush', () => {
			const store = createConnectorDataStore({}, mockResponse())
			store.set('key', 'value')
			store.flush()
			expect(store.hasPendingChanges).toBe(false)
		})
	})

	describe('createConnectorDataStore', () => {
		it('should return a ConnectorDataStore instance', () => {
			const store = createConnectorDataStore({}, mockResponse())
			expect(store).toBeInstanceOf(ConnectorDataStore)
		})
	})
})
