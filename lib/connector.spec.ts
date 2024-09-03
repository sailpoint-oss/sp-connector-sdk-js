/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Connector, createConnector } from './connector'
import { readConfig } from './config'
import { StandardCommand } from './commands'
import { PassThrough } from 'stream'
import { ResponseStream } from './response'
import { major } from 'semver'

import packageJson from '../package.json'
import { createConnectorCustomizer } from './connector-customizer'
import { Context } from './connector-handler'
import path from 'path'

const mockFS = require('mock-fs');

class MockContext implements Context {
	config = {}
	id = 'mockId'
	mockKey = 'mockValue'

	reloadConfig(): Promise<any> {
		return Promise.resolve({})
	}
}

const MOCK_CONTEXT = new MockContext()

describe('class properties and methods', () => {
	it('sdkVersion in Connector class should match major version in package.json', () => {
		const connector = createConnector()
		expect(connector.sdkVersion).toStrictEqual(major(packageJson.version))
		expect(connector.sdkVersion).toStrictEqual(Connector.SDK_VERSION)
	})

	it('should add handlers to connector', () => {
		const connector = createConnector()
			.stdAccountCreate(async (context, input, res) => {})
			.stdAccountDelete(async (context, input, res) => {})
			.stdAccountDisable(async (context, input, res) => {})
			.stdAccountDiscoverSchema(async (context, input, res) => {})
			.stdAccountEnable(async (context, input, res) => {})
			.stdAccountList(async (context, input, res) => {})
			.stdAccountRead(async (context, input, res) => {})
			.stdAccountUnlock(async (context, input, res) => {})
			.stdAccountUpdate(async (context, input, res) => {})
			.stdAuthenticate(async (context, input, res) => {})
			.stdEntitlementList(async (context, input, res) => {})
			.stdEntitlementRead(async (context, input, res) => {})
			.stdTestConnection(async (context, input, res) => {})
			.command('mock:custom:command', async (context, input, res) => {})

		expect(connector.handlers.size).toBe(15)
	})
})

describe('exec handlers', () => {
	it('should execute stdAccountCreateHandler', async () => {
		const connector = createConnector().stdAccountCreate(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input.identity).toStrictEqual('mockIdentity')
			expect(input.attributes).toStrictEqual({})
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(
			StandardCommand.StdAccountCreate,
			MOCK_CONTEXT,
			{
				identity: 'mockIdentity',
				attributes: {},
			},
			new PassThrough({ objectMode: true })
		)
	})

	it('should execute stdAccountDeleteHandler', async () => {
		const connector = createConnector().stdAccountDelete(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input.identity).toStrictEqual('mockIdentity')
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(
			StandardCommand.StdAccountDelete,
			MOCK_CONTEXT,
			{
				identity: 'mockIdentity',
			},
			new PassThrough({ objectMode: true })
		)
	})

	it('should execute stdAccountDiscoverSchemaHandler', async () => {
		const connector = createConnector().stdAccountDiscoverSchema(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input).toBeUndefined()
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(
			StandardCommand.StdAccountDiscoverSchema,
			MOCK_CONTEXT,
			undefined,
			new PassThrough({ objectMode: true })
		)
	})

	it('should execute stdAccountListHandler', async () => {
		const connector = createConnector().stdAccountList(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input).toBeUndefined()
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(
			StandardCommand.StdAccountList,
			MOCK_CONTEXT,
			undefined,
			new PassThrough({ objectMode: true })
		)
	})

	it('should execute stdAccountReadHandler', async () => {
		const connector = createConnector().stdAccountRead(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input.identity).toStrictEqual('mockIdentity')
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(
			StandardCommand.StdAccountRead,
			MOCK_CONTEXT,
			{ identity: 'mockIdentity' },
			new PassThrough({ objectMode: true })
		)
	})

	it('should execute stdAccountUpdateHandler', async () => {
		const connector = createConnector().stdAccountUpdate(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input.identity).toStrictEqual('mockIdentity')
			expect(input.changes).toStrictEqual([])
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(
			StandardCommand.StdAccountUpdate,
			MOCK_CONTEXT,
			{ identity: 'mockIdentity', changes: [] },
			new PassThrough({ objectMode: true })
		)
	})

	it('should execute stdAuthenticateHandler', async () => {
		const connector = createConnector().stdAuthenticate(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input.identity).toStrictEqual('mockIdentity')
			expect(input.username).toStrictEqual('mockUsername')
			expect(input.password).toStrictEqual('mockPassword')
			expect(input.options).toStrictEqual({})
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(
			StandardCommand.StdAuthenticate,
			MOCK_CONTEXT,
			{ identity: 'mockIdentity', username: 'mockUsername', password: 'mockPassword', options :{}},
			new PassThrough({ objectMode: true })
		)
	})

	it('should execute stdEntitlementListHandler', async () => {
		const connector = createConnector().stdEntitlementList(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input).toBeUndefined()
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(
			StandardCommand.StdEntitlementList,
			MOCK_CONTEXT,
			undefined,
			new PassThrough({ objectMode: true })
		)
	})

	it('should execute stdEntitlementRead', async () => {
		const connector = createConnector().stdEntitlementRead(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input.identity).toStrictEqual('mockIdentity')
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(
			StandardCommand.StdEntitlementRead,
			MOCK_CONTEXT,
			{ identity: 'mockIdentity' },
			new PassThrough({ objectMode: true })
		)
	})

	it('should execute stdTestConnectionHandler', async () => {
		const connector = createConnector().stdTestConnection(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input).toBeUndefined()
			expect(res).toBeInstanceOf(ResponseStream)

			res.send({})
		})

		await connector._exec(
			StandardCommand.StdTestConnection,
			MOCK_CONTEXT,
			undefined,
			new PassThrough({ objectMode: true }).on('data', (chunk) => expect(chunk).toEqual({
				"type": "output",
				"data": {},
			}))
		)
	})

	it('should execute std:spec:read handler', async () => {
		const spec = {
			name: "empty connector",
			visibility: "public",
			topology: "private",
			commands: [],
			sourceConfig: [],
		}
		const res = new PassThrough({objectMode: true})
		const connector = createConnector()

		mockFS({
			'connector-spec.json': JSON.stringify(spec),
			[path.join(__dirname, 'connector-spec.json')]: JSON.stringify(spec),
		})
		await connector._exec('std:spec:read', MOCK_CONTEXT, undefined, res)
		mockFS.restore()

		const out = res.read(1)
		expect(out).toEqual({
			"type": "output",
			"data": {"specification": spec},
		})
	})

	it('should execute custom handler', async () => {
		const customCommandType = 'mock:custom:command'

		const connector = createConnector().command(customCommandType, async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input).toBeUndefined()
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(customCommandType, MOCK_CONTEXT, undefined, new PassThrough({ objectMode: true }))
	})

	it('should customizer handler customize input and output', async () => {
		const connector = createConnector()
		.stdAccountCreate(async (context, input, res) => {
			expect(input).toEqual({
				attributes: {
					firstname: 'jane',
					lastname: 'doe'
				}
			})
			res.send({
				identity: 'jane.doe',
				attributes: input.attributes
			})
		})

		const customizer = createConnectorCustomizer()
			.beforeStdAccountCreate(async (context, input) => {
				expect(input).toEqual({
					attributes: {
						firstname: 'john',
						lastname: 'doe'
					}
				})
				input.attributes.firstname = 'jane'
				return input
			})
			.afterStdAccountCreate(async (context, output) => {
				expect(output).toEqual({
					identity: 'jane.doe',
					attributes: {
						firstname: 'jane',
						lastname: 'doe'
					}
				})
				output.attributes.location = 'austin'
				return output
			})

		await connector._exec(StandardCommand.StdAccountCreate, MOCK_CONTEXT, {
			attributes: {
				firstname: 'john',
				lastname: 'doe'
			}
		}, new PassThrough({ objectMode: true }).on('data', (chunk) => expect(chunk).toEqual({
			"type": "output",
			"data": {
				identity: 'jane.doe',
				attributes: {
					firstname: 'jane',
					lastname: 'doe',
					location: 'austin'
				}
			},
		})), customizer)
	})

	it('should execute custom handler with save state', async () => {
		const customCommandType = 'mock:custom:command'

		const connector = createConnector().command(customCommandType, async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input).toBeUndefined()
			expect(res).toBeInstanceOf(ResponseStream)

			res.saveState({newState: 'value'})
		})

		await connector._exec(customCommandType, MOCK_CONTEXT, undefined, new PassThrough({ objectMode: true }).on('data', (chunk) => {
			expect(chunk).toEqual({
				type: 'state',
				data: {
					newState: 'value'
				}
			})
		}))
		
	})

	it('should execute custom handler with connector request', async () => {
		createConnector().command('mock:custom:command', async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input).toBeUndefined()
			expect(res).toBeInstanceOf(ResponseStream)

			let config = await context.reloadConfig()
			expect(config).toEqual({})
		})
	})
})

describe('connector errors', () => {
	it('should throw error when handler does not exist', async () => {
		const connector = createConnector()

		try {
			await connector._exec(
				StandardCommand.StdTestConnection,
				MOCK_CONTEXT,
				undefined,
				new PassThrough({ objectMode: true })
			)
		} catch (e) {
			expect(e).toStrictEqual(new Error(`unsupported command: ${StandardCommand.StdTestConnection}`))
		}
	})

	it('should connector error be handled gracefully', async () => {
		const connector = createConnector()
		.stdTestConnection(async (context, input, res) => {
			throw new Error('Error from connector')
		})

		try {
			await connector._exec(StandardCommand.StdTestConnection, MOCK_CONTEXT, undefined,
				new PassThrough({ objectMode: true }).on('data', (chunk) => {throw new Error('no data should be received here')}))
			throw new Error('connector execution should not work')
		} catch (e) {
			expect(e).toStrictEqual(new Error('Error from connector'))
		}
	})

	it('should customizer before handler error be handled gracefully', async () => {
		const connector = createConnector()
		.stdTestConnection(async (context, input, res) => {
			res.send({})
		})

		const customizer = createConnectorCustomizer()
			.beforeStdTestConnection(async (context, input) => {
				throw new Error('Error from customizer after handler')
			})

		try {
			await connector._exec(StandardCommand.StdTestConnection, MOCK_CONTEXT, undefined,
				new PassThrough({ objectMode: true }).on('data', (chunk) => {throw new Error('no data should be received here')}), customizer)

			throw new Error('connector execution should not work')
		} catch (e) {
			expect(e).toStrictEqual(new Error('Error from customizer after handler'))
		}
	})

	it('should customizer after handler error be handled gracefully', async () => {
		const connector = createConnector()
		.stdTestConnection(async (context, input, res) => {
			res.send({})
		})

		const customizer = createConnectorCustomizer()
			.afterStdTestConnection(async (context, output) => {
				throw new Error('Error from customizer before handler')
			})

		try {
			await connector._exec(StandardCommand.StdTestConnection, MOCK_CONTEXT, undefined,
				new PassThrough({ objectMode: true }).on('data', (chunk) => {
          throw new Error('no data should be received here')
        }), customizer)

			throw new Error('connector execution should not work')
		} catch (e) {
			expect(e).toStrictEqual(new Error('Error from customizer before handler'))
		}
	})
})

describe('read config', () => {
	it('should parse config from base64 encoded string env var', async () => {
		process.env.CONNECTOR_CONFIG = 'eyJrZXkiOiJ2YWx1ZSJ9'


		expect(await readConfig()).toStrictEqual({ key: 'value' })
	})

	it('should throw error when config env var is missing', async () => {
		delete process.env.CONNECTOR_CONFIG

		try {
			await readConfig()
		} catch (e) {
			expect(e).toStrictEqual(new Error(`unexpected runtime error: missing connector config`))
		}
	})

	it('should throw error when config env var cannot be parsed', async () => {
		process.env.CONNECTOR_CONFIG = '1234567890'

		try {
			await readConfig()
		} catch (e) {
			expect(e).toStrictEqual(new Error(`unexpected runtime error: failed to parse connector config`))
		}
	})
})
