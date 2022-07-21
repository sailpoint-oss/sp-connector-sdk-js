/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import {
	CompoundKey,
	Connector,
	Context,
	logger,
	createConnector,
	KeyLookupID,
	readConfig,
	Response,
	StdAccountListOutput,
	StdAccountReadInput,
	StdAccountReadOutput,
	StdTestConnectionOutput,
} from '@sailpoint/connector-sdk'
import { MyClient } from './my-client'

// Get connector source config
const config = readConfig()

// Use the vendor SDK, or implement own client as necessary, to initialize a client
const myClient = new MyClient(config)
const childLogger = logger.child({connectorName:"example"  }, { redact: { paths: [ 'email','password'], censor: '****' } })


// Connector must be exported as module property named `connector`
export const connector: Connector = createConnector()
	.stdTestConnection(async (context: Context, input: undefined, res: Response<StdTestConnectionOutput>) => {
		res.send(await myClient.testConnection())
	})
	.stdAccountList(async (context: Context, input: undefined, res: Response<StdAccountListOutput>) => {
		const accounts = await myClient.getAllAccounts()

		for (const account of accounts) {
			childLogger.info(account,`stdAccountList sending account`)
			res.send({
				key: CompoundKey(account.username, account.id),
				attributes: {
					firstName: account.firstName,
					lastName: account.lastName,
					email: account.email,
				},
			})
		}
		
		logger.info(`stdAccountList sent ${accounts.length} accounts`)
	})
	.stdAccountRead(async (context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
		const account = await myClient.getAccount(KeyLookupID(input))

		res.send({
			key: CompoundKey(account.username, account.id),
			attributes: {
				firstName: account.firstName,
				lastName: account.lastName,
				email: account.email,
			},
		})
	})
