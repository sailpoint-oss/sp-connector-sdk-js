/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Patch, PatchOp, Response } from './response'

/**
 * A persistent key-value data store backed by connector source `connectorAttributes`.
 *
 * Provides a simple API to read and write values that persist across connector invocations.
 * Under the hood, changes are sent via `patchConfig` as JSON Patch operations targeting
 * `/connectorAttributes/<key>`. Only changed values are patched — if a value is set to
 * the same thing it was before, no patch is emitted.
 *
 * @example
 * ```typescript
 * import { createConnectorDataStore, readConfig } from '@sailpoint/connector-sdk'
 *
 * // Inside a command handler:
 * async (context, input, res) => {
 *     const config = await readConfig()
 *     const dataStore = createConnectorDataStore(config, res)
 *
 *     // Read a previously stored value
 *     const lastSync = dataStore.get<string>('lastSyncTimestamp')
 *
 *     // Fetch data since last sync...
 *     const data = await fetchDataSince(lastSync)
 *
 *     // Store the new timestamp (only patched if different)
 *     dataStore.set('lastSyncTimestamp', new Date().toISOString())
 *
 *     // Send all accumulated changes
 *     dataStore.flush()
 * }
 * ```
 */
export class ConnectorDataStore {
	private readonly config: Record<string, any>
	private readonly res: Response<any>
	private readonly pending = new Map<string, { op: 'set' | 'delete'; value?: any }>()

	constructor(config: Record<string, any>, res: Response<any>) {
		this.config = config
		this.res = res
	}

	/**
	 * Get a value from connectorAttributes.
	 * Returns the pending value if one has been set, otherwise the original config value.
	 * @param key Attribute key
	 */
	get<T = any>(key: string): T | undefined {
		const pendingEntry = this.pending.get(key)
		if (pendingEntry) {
			return pendingEntry.op === 'delete' ? undefined : (pendingEntry.value as T)
		}
		return this.config?.connectorAttributes?.[key] as T | undefined
	}

	/**
	 * Set a value in connectorAttributes. The change is buffered until `flush()` is called.
	 * If the value is identical to the current stored value, no patch will be emitted.
	 * @param key Attribute key
	 * @param value Value to store (must be JSON-serializable)
	 */
	set(key: string, value: any): void {
		const current = this.config?.connectorAttributes?.[key]
		if (this.deepEqual(current, value)) {
			this.pending.delete(key)
			return
		}
		this.pending.set(key, { op: 'set', value })
	}

	/**
	 * Remove a key from connectorAttributes. The change is buffered until `flush()` is called.
	 * If the key doesn't exist, no patch will be emitted.
	 * @param key Attribute key to remove
	 */
	delete(key: string): void {
		const exists = this.config?.connectorAttributes?.hasOwnProperty(key)
		if (!exists && !this.pending.has(key)) {
			return
		}
		this.pending.set(key, { op: 'delete' })
	}

	/**
	 * Returns true if there are pending changes that haven't been flushed yet.
	 */
	get hasPendingChanges(): boolean {
		return this.pending.size > 0
	}

	/**
	 * Send all accumulated changes as a single `patchConfig` call.
	 * Only emits patches for values that differ from the original config.
	 * After flushing, pending changes are cleared.
	 */
	flush(): void {
		if (this.pending.size === 0) {
			return
		}

		const patches: Patch[] = []
		const hasConnectorAttributes = this.config?.connectorAttributes != null

		for (const [key, entry] of this.pending) {
			if (entry.op === 'delete') {
				patches.push({ op: PatchOp.Remove, path: `/connectorAttributes/${key}` })
			} else {
				const existed = hasConnectorAttributes && this.config.connectorAttributes.hasOwnProperty(key)
				patches.push({
					op: existed ? PatchOp.Replace : PatchOp.Add,
					path: `/connectorAttributes/${key}`,
					value: entry.value,
				})
			}
		}

		if (patches.length > 0) {
			this.res.patchConfig(patches)
		}

		this.pending.clear()
	}

	private deepEqual(a: any, b: any): boolean {
		if (a === b) return true
		if (a == null || b == null) return false
		if (typeof a !== typeof b) return false
		if (typeof a !== 'object') return false
		return JSON.stringify(a) === JSON.stringify(b)
	}
}

/**
 * Creates a persistent data store backed by `connectorAttributes` in the source config.
 *
 * @param config The connector config object (from `readConfig()`)
 * @param res The response object from the current command handler
 * @returns A ConnectorDataStore instance
 */
export function createConnectorDataStore(config: Record<string, any>, res: Response<any>): ConnectorDataStore {
	return new ConnectorDataStore(config, res)
}
