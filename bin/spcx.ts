#!/usr/bin/env node
import express from 'express'
import { Transform, TransformCallback } from 'stream'
import path from 'path'
import { inspect } from 'util'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { Connector, ConnectorError, ConnectorErrorType, CustomizerType, _withConfig } from '../lib'
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
		const tsc = spawn(/^win/.test(process.platform) ? 'tsc.cmd' : 'tsc', ['--inlineSourcemap', 'true', '--sourceMap', 'false', '--watch'], { shell: true })
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
		let c = require(connectorPath)
		const connector = c.connector
		const connectorCustomizer = c.connectorCustomizer
		Object.keys(require.cache)
			.filter((key: string) => !key.includes('node_modules'))
			.forEach((key: string) => delete require.cache[key])

		return {
			connector: typeof connector === 'function' ? await connector() : connector,
			connectorCustomizer: typeof connectorCustomizer === 'function' ? await connectorCustomizer() : connectorCustomizer
		}
	}

	const isPrematureClose = (err: unknown): boolean =>
		typeof err === 'object' &&
		err !== null &&
		'code' in err &&
		(err as { code?: string }).code === 'ERR_STREAM_PREMATURE_CLOSE'

	const app = express()
		.use(express.json({ strict: true, limit: '100mb' }))
		.post('/', async (req, res) => {
			try {
				const cmd: Command = req.body as Command
				await _withConfig(cmd.config, async () => {
					const c = await loadConnector(connectorPath)
					// text/event-stream (not application/x-ndjson): Caddy and nginx only
					// disable buffering for SSE, so keepAlive chunks leave the reverse proxy.
					// The body is still one JSON object per line.
					res.status(200)
					res.set({
						'Content-Type': 'text/event-stream; charset=utf-8',
						'Cache-Control': 'no-cache, no-transform',
						Connection: 'keep-alive',
						'X-Accel-Buffering': 'no',
					})
					res.flushHeaders()
					if (res.socket && typeof res.socket.setNoDelay === 'function') {
						res.socket.setNoDelay(true)
					}
					const out = new Transform({
						writableObjectMode: true,
						transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
							try {
								this.push(JSON.stringify(chunk) + '\n')
							} catch (e: any) {
								callback(e)
							}
							callback()
						},
					})

					// pipe() rather than pipeline(): Caddy/fetch closing the HTTP
					// socket after a complete body is not an error, but pipeline()
					// reports it as ERR_STREAM_PREMATURE_CLOSE.
					const ignorePrematureClose = (err: unknown) => {
						if (err && !isPrematureClose(err)) {
							console.error(err)
						}
					}
					res.on('error', ignorePrematureClose)
					out.pipe(res, { end: true })

					await new Promise<void>(async (resolve, reject) => {
						let settled = false
						const finish = () => {
							if (!settled) {
								settled = true
								resolve()
							}
						}
						out.on('finish', finish)
						out.on('error', (e) => {
							if (isPrematureClose(e)) {
								finish()
								return
							}
							if (!settled) {
								settled = true
								reject(e)
							}
						})

						try {
							if (c.connector == null && c.connectorCustomizer == null) {
								return reject(new Error('Connector not found. Did you export it?'))
							}

							// Running connector is exists. This will also run customizer if customizer exists.
							if (c.connector != null) {
								return await c.connector._exec(cmd.type, { version: cmd.version, commandType: cmd.type },
									cmd.input, out, c.connectorCustomizer)
							}

							// Run customizer only
							let output = await c.connectorCustomizer._exec(cmd.type, { version: cmd.version, commandType: cmd.type },
								cmd.input, out)
							out.write(output)
						} catch (e) {
							reject(e)
						} finally {
							if (!out.writableEnded) {
								out.end()
							}
						}
					})

					await new Promise<void>((resolve) => {
						if (res.writableEnded || res.destroyed) {
							resolve()
							return
						}
						res.once('finish', () => resolve())
						res.once('close', () => resolve())
					})
				})
			} catch (e: any) {
				console.error(typeof e === "string" ? e : e?.message)

				let errorType = ConnectorErrorType.Generic
				if (e instanceof ConnectorError) {
					errorType = e.type
				}
				if (!res.headersSent) {
					res.status(500)
				}
				if (!res.writableEnded) {
					res.write(`${errorType} error: \n + ${inspect(e)}`)
				}
			} finally {
				if (!res.writableEnded) {
					res.end()
				}
			}
		})

	app.listen(port, () => {
		console.log(`SailPoint connector local development server listening at http://localhost:${port}`)
	})
}

