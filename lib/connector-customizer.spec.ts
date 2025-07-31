/* Copyright (c) 2023. SailPoint Technologies, Inc. All rights reserved. */

import { log } from 'console'
import { StandardCommand } from './commands'
import { CustomizerType, createConnectorCustomizer } from './connector-customizer'
import { Context, AssumeAwsRoleRequest, AssumeAwsRoleResponse } from './connector-handler'

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

	customizedOperation(operationIdentifier: string, input: any) {
		return ''
	}

}

const MOCK_CONTEXT = new MockContext()

describe('class properties and methods', () => {
	it('should add handlers to connector customizer', async () => {
		const customizer = createConnectorCustomizer()
			.beforeStdTestConnection(async (context, input) => {return input})
			.afterStdTestConnection(async (context, output) => {return output})
			.beforeStdAccountCreate(async (context, input) => {return input})
			.afterStdAccountCreate(async (context, output) => {return output})
			.beforeStdAccountRead(async (context, input) => {return input})
			.afterStdAccountRead(async (context, output) => {return output})
			.beforeStdAccountUpdate(async (context, input) => {return input})
			.afterStdAccountUpdate(async (context, output) => {return output})
			.beforeStdAccountDelete(async (context, input) => {return input})
			.afterStdAccountDelete(async (context, output) => {return output})
			.beforeStdAccountEnable(async (context, input) => {return input})
			.afterStdAccountEnable(async (context, output) => {return output})
			.beforeStdAccountDisable(async (context, input) => {return input})
			.afterStdAccountDisable(async (context, output) => {return output})
			.beforeStdAccountUnlock(async (context, input) => {return input})
			.afterStdAccountUnlock(async (context, output) => {return output})
			.beforeStdAccountList(async (context, input) => {return input})
			.afterStdAccountList(async (context, output) => {return output})
			.beforeStdAuthenticate(async (context, input) => {return input})
			.afterStdAuthenticate(async (context, output) => {return output})
			.beforeStdConfigOptions(async (context, input) => {return input})
			.afterStdConfigOptions(async (context, output) => {return output})
			.beforeStdApplicationDiscoveryList(async (context, input) => {return input})
			.afterStdApplicationDiscoveryList(async (context, output) => {return output})
			.beforeStdEntitlementRead(async (context, input) => {return input})
			.afterStdEntitlementRead(async (context, output) => {return output})
			.beforeStdEntitlementList(async (context, input) => {return input})
			.afterStdEntitlementList(async (context, output) => {return output})
			.beforeStdChangePassword(async (context, input) => {return input})
			.afterStdChangePassword(async (context, output) => {return output})
			.beforeStdSourceDataDiscover(async (context, input) => {return input})
			.beforeStdSourceDataRead(async (context, input) => {return input})
			.afterStdSourceDataDiscover(async (context, output) => {return output})
			.afterStdSourceDataRead(async (context, output) => {return output})

		expect(customizer.handlers.size).toBe(34)
	})
})

describe('exec handlers', () => {
	it('should customizer handle commands', async () => {
		const customizer = createConnectorCustomizer()
			.beforeStdAccountCreate(async (context, input) => {
				input.attributes.firstname = 'jane'
				return input
			})
			.afterStdAccountCreate(async (context, output) => {
				output.attributes.location = 'austin'
				return output
			})
			.customizedOperationHandler('tc:before',async (context, output) => {
				output.attributes.location = 'austin'
				return output
			})
			// .beforeEndpoint(async () => {
			// 	console.log("Before Endpoint method")
			// },['Account Aggregation'])

		let customizedInput = await customizer._exec(customizer.handlerKey(CustomizerType.Before, StandardCommand.StdAccountCreate),
			MOCK_CONTEXT, {
				attributes: {
					firstname: 'john',
					lastname: 'doe'
			}
			})
		expect(customizedInput.attributes.firstname).toBe('jane')

		let customizedOutput = await customizer._exec(customizer.handlerKey(CustomizerType.After, StandardCommand.StdAccountCreate),
			MOCK_CONTEXT, {
				attributes: {
					firstname: 'john',
					lastname: 'doe'
			}
			})
		expect(customizedOutput.attributes.location).toBe('austin')
	})

	it('should customizer throw error if handler is not defined', async () => {
		const customizer = createConnectorCustomizer()
		try {
			await customizer._exec(customizer.handlerKey(CustomizerType.Before, StandardCommand.StdAccountCreate), MOCK_CONTEXT, {})
			fail()
		} catch (e) {
			expect(e).toStrictEqual(new Error(`No handler found for type: before:std:account:create`))
		}
	})
})