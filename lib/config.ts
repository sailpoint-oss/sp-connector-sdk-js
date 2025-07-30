/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */
import { AsyncLocalStorage } from 'async_hooks';

interface configState {
	cfg: any
}

const _configState = new AsyncLocalStorage<configState>();
let _config: any = undefined;

/**
 * Reads in connector config
 */
export const readConfig = async (): Promise<any> => {
	const store: configState | undefined = _configState.getStore();
	if (store) {
		return store.cfg;
	}

	if (_config != undefined) {
		return _config;
	}

	const config = process.env['CONNECTOR_CONFIG']
	if (!config) {
		throw new Error(`unexpected runtime error: missing connector config`)
	}

	try {
		_config = JSON.parse(Buffer.from(config, 'base64').toString())
		delete process.env.CONNECTOR_CONFIG
		return _config;
	} catch (ignored) {
		throw new Error(`unexpected runtime error: failed to parse connector config`)
	}
}

/**
 * _withConfig executes callback and ensures that all readConfig calls in
 * callback return cfg
 */
export const _withConfig = async (cfg: any, callback: () => unknown): Promise<void> => {
	const newState: configState = { cfg: cfg };
	await _configState.run(newState, callback);
}
