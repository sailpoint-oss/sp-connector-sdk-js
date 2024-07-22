/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import { RawResponse, Response, ResponseType } from './response'

interface configState {
	cfg: any
}

const _configState = new AsyncLocalStorage<configState>();

/**
 * Reads in connector config
 */
export const readConfig = async (): Promise<any> => {
	const store: configState | undefined = _configState.getStore();
	if (store) {
		return store.cfg;
	}

	const config = process.env['CONNECTOR_CONFIG']
	if (!config) {
		throw new Error(`unexpected runtime error: missing connector config`)
	}

	try {
		return JSON.parse(Buffer.from(config, 'base64').toString())
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

export const reloadConfig = async (res: Response<any>): Promise<any> => {

	let requestId = uuidv4()
	let dir = `/tmp/${requestId}`
	let request = {
		requestId: requestId
	}
	fs.mkdirSync(dir)
	fs.writeFileSync(`${dir}/request.json`, JSON.stringify(request), {flag: 'w'})

	// Write
	res.sendResponse(new RawResponse(request, ResponseType.ReloadConfig))

	// Wait for response with timeout
	return new Promise(function (resolve, reject) {
		// Wait for response with timeout
		var timer = setTimeout(function () {
			watcher.close()
			reject (new Error('File did not exists and was not created during the timeout.'))
		}, 10000)


		var responseFileName = 'response.json'
		var watcher = fs.watch(dir, function (eventType, filename) {
			if (eventType == 'rename' && filename == responseFileName) {
				clearTimeout(timer);
				watcher.close()
				fs.readFile(`${dir}/${responseFileName}`, {encoding: 'utf-8'}, function (err, data) {
					clearTimeout(timer);
					watcher.close();
					if (err) {
						reject(err)
					} else {
						resolve(data)
					}
				})
			}
		})
	})
}
