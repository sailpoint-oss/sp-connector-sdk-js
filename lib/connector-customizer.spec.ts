/* Copyright (c) 2023. SailPoint Technologies, Inc. All rights reserved. */

import { StandardCommand } from './commands'
import { HandlerType, createConnectorCustomizer } from './connector-customizer'

const mockFS = require('mock-fs')

const MOCK_CONTEXT = {
	config: {},
	id: 'mockId',
	mockKey: 'mockValue',
}

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
			.beforeStdEntitlementRead(async (context, input) => {return input})
			.afterStdEntitlementRead(async (context, output) => {return output})
			.beforeStdEntitlementList(async (context, input) => {return input})
			.beforeStdChangePassword(async (context, input) => {return input})
			.afterStdChangePassword(async (context, output) => {return output})

		expect(customizer.handlers.size).toBe(22)
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

		let customizedInput = await customizer._exec(StandardCommand.StdAccountCreate, HandlerType.Before, MOCK_CONTEXT, {
			attributes: {
				firstname: 'john',
				lastname: 'doe'
			}
		})
		expect(customizedInput.attributes.firstname).toBe('jane')

		let customizedOutput = await customizer._exec(StandardCommand.StdAccountCreate, HandlerType.After, MOCK_CONTEXT, {
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
			await customizer._exec(StandardCommand.StdAccountCreate, HandlerType.Before, MOCK_CONTEXT, {})
			fail()
		} catch (e) {
			expect(e).toStrictEqual(new Error(`No ${HandlerType.Before} handler found for command: ${StandardCommand.StdAccountCreate}`))
		}
	})
})

