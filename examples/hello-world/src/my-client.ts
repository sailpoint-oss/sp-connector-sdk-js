/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

const MOCK_DATA = new Map([
	[
		'john.doe',
		{
			id: '1',
			username: 'john.doe',
			firstName: 'john',
			lastName: 'doe',
			email: 'john.doe@example.com',
		},
	],
	[
		'jane.doe',
		{
			id: '2',
			username: 'jane.doe',
			firstName: 'jane',
			lastName: 'doe',
			email: 'jane.doe@example.com',
		},
	],
])

export class MyClient {
	private readonly token?: string
	private readonly mockConfig?: string

	constructor(config: any) {
		// Fetch necessary properties from config.
		// Following properties actually do not exist in the config -- it just serves as an example.
		this.token = config?.token
		this.mockConfig = config?.mockConfig
	}

	async getAllAccounts(): Promise<any[]> {
		return Array.from(MOCK_DATA.values())
	}

	async getAccount(identity: string): Promise<any> {
		// In a real use case, this requires a HTTP call out to SaaS app to fetch an account,
		// which is why it's good practice for this to be async and return a promise.
		return MOCK_DATA.get(identity)
	}

	async testConnection(): Promise<any> {
		// In a real use case, this would call some endpoint in SaaS app to test connection,
		// or maybe even validate authorization using token from config.
		if (MOCK_DATA === undefined) {
			throw new Error('no data!')
		}

		return {}
	}
}
