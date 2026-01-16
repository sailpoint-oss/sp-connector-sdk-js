/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Connector, createConnector } from './connector'
import { readConfig } from './config'
import { DatasetSchema, StandardCommand } from './commands'
import { PassThrough } from 'stream'
import { ResponseStream, ResponseStreamTransform } from './response'
import { major } from 'semver'

import packageJson from '../package.json'
import { createConnectorCustomizer } from './connector-customizer'
import { Context, AssumeAwsRoleRequest, AssumeAwsRoleResponse } from './connector-handler'
import path from 'path'

const mockFS = require('mock-fs');

class MockContext implements Context {
	config = {}
	id = 'mockId'
	mockKey = 'mockValue'

	reloadConfig(): Promise<any> {
		return Promise.resolve({})
	}

	assumeAwsRole(assumeAwsRoleRequest: AssumeAwsRoleRequest): Promise<AssumeAwsRoleResponse> {
		return Promise.resolve(new AssumeAwsRoleResponse('ccessKeyId', 'secretAccessKey', 'sessionToken', '123'))
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
			.stdConfigOptions(async (context, input, res) => {})
			.stdApplicationDiscoveryList(async (context, input, res) => {})
			.stdEntitlementList(async (context, input, res) => {})
			.stdEntitlementRead(async (context, input, res) => {})
			.stdTestConnection(async (context, input, res) => {})
			.stdSsfStreamCreate(async (context, input, res) => {})
			.stdSsfStreamDelete(async (context, input, res) => {})
			.stdSsfStreamDiscover(async (context, input, res) => {})
			.stdSsfStreamRead(async (context, input, res) => {})
			.stdSsfStreamReplace(async (context, input, res) => {})
			.stdSsfStreamStatusUpdate(async (context, input, res) => {})
			.stdSsfStreamVerify(async (context, input, res) => {})
			.stdSsfStreamUpdate(async (context, input, res) => {})
			.stdAgentList(async (context, input, res) => {})
			.command('mock:custom:command', async (context, input, res) => {})

		expect(connector.handlers.size).toBe(26)
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


	it('should execute stdConfigOptionsHandler', async () => {
		const connector = createConnector().stdConfigOptions(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input.key).toStrictEqual('mockKey')
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(
			StandardCommand.StdConfigOptions,
			MOCK_CONTEXT,
			{ key: 'mockKey'},
			new PassThrough({ objectMode: true })
		)
	})

	it('should execute stdApplicationDiscoveryListHandler', async () => {
		const connector = createConnector().stdApplicationDiscoveryList(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input).toBeUndefined()
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(
			StandardCommand.StdApplicationDiscoveryList,
			MOCK_CONTEXT,
			undefined,
			new PassThrough({ objectMode: true })
		)
	})

	it('should execute stdApplicationDiscoveryListWithDataset', async () => {
		let datasetIds: string[] = [];
		const connector = createConnector().stdApplicationDiscoveryListWithDataset(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input).toBeDefined()
			expect(res).toBeInstanceOf(ResponseStreamTransform)
			datasetIds.push(input.datasetId)
		})

		await connector._exec(
			StandardCommand.StdApplicationDiscoveryList,
			MOCK_CONTEXT,
			{ datasetIds: ["dataset1", "dataset2"] },
			new PassThrough({ objectMode: true })
		)

		expect(datasetIds).toEqual(["dataset1", "dataset2"])
	})

	describe('stdApplicationDiscoveryListWithDataset - additionalParameters enhancements', () => {
		it('should pass additionalParameters in fallback mode (single datasetId)', async () => {
			let receivedInput: any = null;
			const connector = createConnector().stdApplicationDiscoveryListWithDataset(async (context, input, res) => {
				receivedInput = input;
			})

			const additionalParams = {
				savvy_url: 'https://test.s3.url/presigned',
				other_param: 'test_value'
			};

			await connector._exec(
				StandardCommand.StdApplicationDiscoveryList,
				MOCK_CONTEXT,
				{ datasetId: 'savvy:applications', additionalParameters: additionalParams },
				new PassThrough({ objectMode: true })
			)

			expect(receivedInput).toBeDefined();
			expect(receivedInput.datasetId).toBe('savvy:applications');
			expect(receivedInput.additionalParameters).toBeDefined();
			expect(receivedInput.additionalParameters.savvy_url).toBe('https://test.s3.url/presigned');
			expect(receivedInput.additionalParameters.other_param).toBe('test_value');
		})

		it('should handle fallback mode without additionalParameters (backward compatibility)', async () => {
			let receivedInput: any = null;
			const connector = createConnector().stdApplicationDiscoveryListWithDataset(async (context, input, res) => {
				receivedInput = input;
			})

			await connector._exec(
				StandardCommand.StdApplicationDiscoveryList,
				MOCK_CONTEXT,
				{ datasetId: 'savvy:applications' },
				new PassThrough({ objectMode: true })
			)

			expect(receivedInput).toBeDefined();
			expect(receivedInput.datasetId).toBe('savvy:applications');
			expect(receivedInput.additionalParameters).toBeUndefined();
		})

		it('should pass additionalParameters in dataset-aware mode (array of datasetIds)', async () => {
			const receivedInputs: any[] = [];
			const connector = createConnector().stdApplicationDiscoveryListWithDataset(async (context, input, res) => {
				receivedInputs.push(input);
			})

			const additionalParams = {
				savvy_url: 'https://test.s3.url/presigned',
				other_param: 'test_value'
			};

			await connector._exec(
				StandardCommand.StdApplicationDiscoveryList,
				MOCK_CONTEXT,
				{ datasetIds: ['savvy:applications', 'savvy:other'], additionalParameters: additionalParams },
				new PassThrough({ objectMode: true })
			)

			expect(receivedInputs.length).toBe(2);
			expect(receivedInputs[0].datasetId).toBe('savvy:applications');
			expect(receivedInputs[0].additionalParameters).toBeDefined();
			expect(receivedInputs[0].additionalParameters.savvy_url).toBe('https://test.s3.url/presigned');
			expect(receivedInputs[0].additionalParameters.other_param).toBe('test_value');
			expect(receivedInputs[1].datasetId).toBe('savvy:other');
			expect(receivedInputs[1].additionalParameters).toBeDefined();
			expect(receivedInputs[1].additionalParameters.savvy_url).toBe('https://test.s3.url/presigned');
			expect(receivedInputs[1].additionalParameters.other_param).toBe('test_value');
		})

		it('should handle dataset-aware mode without additionalParameters (backward compatibility)', async () => {
			const receivedInputs: any[] = [];
			const connector = createConnector().stdApplicationDiscoveryListWithDataset(async (context, input, res) => {
				receivedInputs.push(input);
			})

			await connector._exec(
				StandardCommand.StdApplicationDiscoveryList,
				MOCK_CONTEXT,
				{ datasetIds: ['savvy:applications', 'savvy:other'] },
				new PassThrough({ objectMode: true })
			)

			expect(receivedInputs.length).toBe(2);
			expect(receivedInputs[0].datasetId).toBe('savvy:applications');
			expect(receivedInputs[0].additionalParameters).toBeUndefined();
			expect(receivedInputs[1].datasetId).toBe('savvy:other');
			expect(receivedInputs[1].additionalParameters).toBeUndefined();
		})

		it('should handle empty datasetIds array (fallback to single datasetId mode)', async () => {
			let receivedInput: any = null;
			const connector = createConnector().stdApplicationDiscoveryListWithDataset(async (context, input, res) => {
				receivedInput = input;
			})

			const additionalParams = {
				savvy_url: 'https://test.s3.url/presigned'
			};

			await connector._exec(
				StandardCommand.StdApplicationDiscoveryList,
				MOCK_CONTEXT,
				{ datasetIds: [], datasetId: 'savvy:applications', additionalParameters: additionalParams },
				new PassThrough({ objectMode: true })
			)

			expect(receivedInput).toBeDefined();
			expect(receivedInput.datasetId).toBe('savvy:applications');
			expect(receivedInput.additionalParameters).toBeDefined();
			expect(receivedInput.additionalParameters.savvy_url).toBe('https://test.s3.url/presigned');
		})

		it('should handle null input (fallback mode with empty datasetId)', async () => {
			let receivedInput: any = null;
			const connector = createConnector().stdApplicationDiscoveryListWithDataset(async (context, input, res) => {
				receivedInput = input;
			})

			await connector._exec(
				StandardCommand.StdApplicationDiscoveryList,
				MOCK_CONTEXT,
				null,
				new PassThrough({ objectMode: true })
			)

			expect(receivedInput).toBeDefined();
			expect(receivedInput.datasetId).toBe('');
			expect(receivedInput.additionalParameters).toBeUndefined();
		})

		it('should handle undefined input (fallback mode with empty datasetId)', async () => {
			let receivedInput: any = null;
			const connector = createConnector().stdApplicationDiscoveryListWithDataset(async (context, input, res) => {
				receivedInput = input;
			})

			await connector._exec(
				StandardCommand.StdApplicationDiscoveryList,
				MOCK_CONTEXT,
				undefined,
				new PassThrough({ objectMode: true })
			)

			expect(receivedInput).toBeDefined();
			expect(receivedInput.datasetId).toBe('');
			expect(receivedInput.additionalParameters).toBeUndefined();
		})

		it('should handle multiple datasets with complex additionalParameters', async () => {
			const receivedInputs: any[] = [];
			const connector = createConnector().stdApplicationDiscoveryListWithDataset(async (context, input, res) => {
				receivedInputs.push(input);
			})

			const additionalParams = {
				savvy_url: 'https://test.s3.url/presigned',
				param1: 'value1',
				param2: 123,
				nested: {
					key: 'nested_value'
				},
				array: [1, 2, 3]
			};

			await connector._exec(
				StandardCommand.StdApplicationDiscoveryList,
				MOCK_CONTEXT,
				{ datasetIds: ['dataset1', 'dataset2', 'dataset3'], additionalParameters: additionalParams },
				new PassThrough({ objectMode: true })
			)

			expect(receivedInputs.length).toBe(3);
			receivedInputs.forEach((input, index) => {
				expect(input.datasetId).toBe(`dataset${index + 1}`);
				expect(input.additionalParameters).toBeDefined();
				expect(input.additionalParameters.savvy_url).toBe('https://test.s3.url/presigned');
				expect(input.additionalParameters.param1).toBe('value1');
				expect(input.additionalParameters.param2).toBe(123);
				expect(input.additionalParameters.nested).toEqual({ key: 'nested_value' });
				expect(input.additionalParameters.array).toEqual([1, 2, 3]);
			});
		})
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

	it('should execute stdAgentListHandler', async () => {
		let datasetIds: string[] = [];
		const connector = createConnector().stdAgentList(async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input).toBeDefined()
			expect(res).toBeInstanceOf(ResponseStreamTransform)
			datasetIds.push(input.datasetId)
		})

		await connector._exec(
			"std:agent:list",
			MOCK_CONTEXT,
			{ datasetIds: ["dataset1", "dataset2"] },
			new PassThrough({ objectMode: true })
		)

		expect(datasetIds).toEqual(["dataset1", "dataset2"])
	})

	it('should execute stdAgentListHandler with datasetSchemas', async () => {
		const datasetIds: string[] = [];
		const receivedSchemas: (DatasetSchema | undefined)[] = [];

		// Mock dataset schemas for test
		const mockSchemas: Record<string, DatasetSchema> = {
			dataset1: {
				name: 'Dataset 1',
				config: {
					datasetId: 'datasetId1',
					datasetType: 'std:agent'
				},
				displayAttribute: 'name',
				identityAttribute: 'id',
				groupAttribute: 'group',
				attributes: [
					{ name: 'foo', description: '', type: 'string' },
					{ name: 'timestamp', description: '', type: 'number' },
				],
			},
			dataset2: {
				name: 'Dataset 2',
				config: {
					datasetId: 'datasetId2',
					datasetType: 'std:agent'
				},
				displayAttribute: 'displayName',
				identityAttribute: 'identifier',
				groupAttribute: 'group',
				attributes: [
					{ name: 'firstname', description: '', type: 'string' },
					{ name: 'lastname', description: '', type: 'string' },
				],
			},
		}

		const connector = createConnector().stdAgentList(
			async (context, input, res) => {
				expect(context).toBeDefined();
				expect(input).toBeDefined();
				expect(res).toBeInstanceOf(ResponseStreamTransform);

				datasetIds.push(input.datasetId);
				receivedSchemas.push(input.datasetSchema);
			}
		);

		await connector._exec(
			"std:agent:list",
			MOCK_CONTEXT,
			{
				datasetIds: ["dataset1", "dataset2"],
				datasetSchemas: mockSchemas
			},
			new PassThrough({ objectMode: true })
		);

		// Ensure datasetIds are handled in order
		expect(datasetIds).toEqual(["dataset1", "dataset2"]);

		// Ensure schema values match
		expect(receivedSchemas).toEqual([
			mockSchemas["dataset1"],
			mockSchemas["dataset2"]
		]);
	});


	it('should execute custom handler', async () => {
		const customCommandType = 'mock:custom:command'

		const connector = createConnector().command(customCommandType, async (context, input, res) => {
			expect(context).toBeDefined()
			expect(input).toBeUndefined()
			expect(res).toBeInstanceOf(ResponseStream)
		})

		await connector._exec(customCommandType, MOCK_CONTEXT, undefined, new PassThrough({ objectMode: true }))
	})

	it('should customizer handler handle output with mixed response types', async () => {
		const connector = createConnector()
		.stdTestConnection(async (context, input, res) => {
			expect(input).toEqual({})

			res.keepAlive()
			res.send({})
		})

		const customizer = createConnectorCustomizer()
		.beforeStdTestConnection(async (context, input) => {
			expect(input).toEqual({})
			return input
		})
		.afterStdTestConnection(async (context, output) => {
			expect(output).toEqual({})
			return output
		})

		await connector._exec(StandardCommand.StdTestConnection, MOCK_CONTEXT, {},
			new PassThrough({ objectMode: true }).on('data', (chunk) => {
				if (chunk.type == 'keepAlive') {
					expect(chunk.data).toEqual({})
				}
				if (chunk.type == 'data') {
					expect(chunk.data).toEqual({})
				}
		}), customizer)
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
