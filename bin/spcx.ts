#!/usr/bin/env -S node --enable-source-maps
import express from 'express'
import { pipeline, Transform, TransformCallback } from 'stream'
import path from 'path'
import { inspect } from 'util'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { Connector, ConnectorError, ConnectorErrorType, _withConfig } from '../lib'


/**
 * Connector command
 */
interface Command {
	version?: number
	type: string
	input: any
	config: { [configKey: string]: any }
}

const argv: string[] = process.argv.slice(2)
// We are expecting argv similar to: [**/*.js, port?]
if (!argv[0]) {
	throw new Error('missing arg: connector file')
} else if (path.extname(argv[0]) !== '.js') {
	throw new Error(`invalid arg: ${argv[0]}`)
}

const connectorPath: string = path.resolve(process.cwd(), argv[0])
const port: number = Number(argv[1]) || 3000

/**
 * Spawns a child process that runs TypeScript compiler (tsc) with watch option and inlineSourcemap for debugging.
 * spawn will fail in pure JS projects as typescript devDependency is expected to be missing
 */
const spawnTsc = (): ChildProcessWithoutNullStreams => {
	const tsc = spawn('tsc', ['--inlineSourcemap', 'true', '--sourceMap', 'false', '--watch'])
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
