#!/usr/bin/env node
import express from 'express'
import { pipeline, Transform, TransformCallback } from 'stream'
import path from 'path'
import { inspect } from 'util'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { Connector, ConnectorError, ConnectorErrorType, _withConfig } from '../lib'
import archiver from 'archiver'
import fs from 'fs'


/**
 * Connector command
 */
interface Command {
	version?: number
	type: string
	input: any
	config: { [configKey: string]: any }
}

const COMMAND_RUN: string = 'run'
const COMMAND_PACKAGE: string = 'package'

const argv: string[] = process.argv.slice(2)
// We are expecting argv similar to: [**/*.js, port?]
if (!argv[0]) {
	throw new Error('missing arg: need at least one arg for the command')
} else if (argv[0] == COMMAND_PACKAGE) {
	packageConnector()
} else {
	runDev()
}

// packageConnector packages connector files into a zip file 
function packageConnector() {
	const zipName = process.env.npm_package_name + '-' + process.env.npm_package_version + '.zip'
	const archive = archiver('zip', { zlib: { level: 9 }})
	const stream = fs.createWriteStream('dist/' + zipName)

	archive.file('dist/index.js', {name: 'index.js'})
	.file('connector-spec.json', {name: 'connector-spec.json'})
	.on('error', err => {
		console.error('Failed to generate connector zip file', err)
	})
	.pipe(stream)

	stream.on('close', () => {
		console.log('Connector zip file created under dist folder: ' + zipName)
	})
	archive.finalize()
}

// runDev runs a local server to invoke commands to the connector
function runDev() {
	let connectorPath: string = path.resolve(process.cwd(), argv[0])
	let port: number = Number(argv[1]) || 3000

	if (argv[0] == COMMAND_RUN) {
		connectorPath = path.resolve(process.cwd(), argv[1])
		port = Number(argv[2]) || 3000
	}

	if (path.extname(connectorPath) !== '.js') {
		throw new Error(`invalid file path: ${connectorPath}`)
	}
	
	/**
	 * Spawns a child process that runs TypeScript compiler (tsc) with watch option and inlineSourcemap for debugging.
	 * spawn will fail in pure JS projects as typescript devDependency is expected to be missing
	 */
	const spawnTsc = (): ChildProcessWithoutNullStreams => {
		const tsc = spawn(/^win/.test(process.platform) ? 'tsc.cmd' : 'tsc', ['--inlineSourcemap', 'true', '--sourceMap', 'false', '--watch'])
			.once('spawn', () => {
				tsc.stdout.on('data', (data) => console.log(`tsc: ${data}`))
				tsc.stderr.on('data', (data) => console.error(`tsc: ${data}`))
			})
			.once('error', (ignored) => {})
	
		return tsc
	}
	
	spawnTsc()
	
	/**
	 * Loads the connector module from specified connectorPath.
	 * Connector config is set as env var to be read via `readConfig()`.
	 *
	 * Implementation Notes:
	 * We need to cleanly init and destroy connector and env var each time, so that this function may perform correctly
	 * under async calls. The connector module is prevented from being cached in `required`,
	 * and the CONNECTOR_CONFIG env var is deleted once it is read into the connector
	 *
	 * @param connectorPath Path to connector module
	 * @param config Connector config
	 */
	const loadConnector = async (connectorPath: string) => {
		const connector = require(connectorPath).connector
		Object.keys(require.cache)
			.filter((key: string) => !key.includes('node_modules'))
			.forEach((key: string) => delete require.cache[key])
	
		let result
		if (typeof connector === 'function') {
			result = await connector()
		} else {
			result = connector
		}
		return result
	}
	
	const app = express()
		.use(express.json({ strict: true }))
		.post('/*', async (req, res) => {
			try {
				const cmd: Command = req.body as Command
				await _withConfig(cmd.config, async () => {
					const connector: Connector = await loadConnector(connectorPath)
					const out = new Transform({
						writableObjectMode: true,
						transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
							try {
								this.push(JSON.stringify(chunk) + '\n')
							} catch (e) {
								callback(e)
							}
							callback()
						},
					})
	
					pipeline(out, res.status(200).type('application/x-ndjson'), (err) => {
						if (err) {
							console.error(err)
						}
					})
	
					await connector._exec(cmd.type, { version: cmd.version, commandType: cmd.type }, cmd.input, out)
					out.end()
				})
			} catch (e) {
				console.error(e?.message || e)
				
				let errorType = ConnectorErrorType.Generic
				if (e instanceof ConnectorError) {
					errorType = e.type
				}
				res.status(500).send(`${errorType} error: \n + ${inspect(e)}`)
			} finally {
				res.end()
			}
		})
	
	app.listen(port, () => {
		console.log(`SailPoint connector local development server listening at http://localhost:${port}`)
	})
}

