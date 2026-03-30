/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import axios from 'axios'
import { createConnectorHttpClient } from './http-client'

jest.mock('axios', () => {
	const interceptors = {
		request: { use: jest.fn() },
		response: { use: jest.fn() },
	}
	const instance = {
		interceptors,
		defaults: { headers: { common: {} } },
	}
	return {
		__esModule: true,
		default: {
			create: jest.fn(() => instance),
		},
	}
})

describe('createConnectorHttpClient', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should create an Axios instance with default options', () => {
		const client = createConnectorHttpClient()

		expect(axios.create).toHaveBeenCalledWith(
			expect.objectContaining({
				timeout: 30000,
			})
		)
		expect(client.interceptors.request.use).toHaveBeenCalled()
		expect(client.interceptors.response.use).toHaveBeenCalled()
	})

	it('should create an Axios instance with provided options', () => {
		createConnectorHttpClient({
			baseURL: 'https://api.example.com',
			headers: { Authorization: 'Bearer token123' },
			timeout: 5000,
		})

		expect(axios.create).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: 'https://api.example.com',
				timeout: 5000,
				headers: expect.objectContaining({
					Authorization: 'Bearer token123',
				}),
			})
		)
	})

	it('should merge axiosOptions with explicit options', () => {
		createConnectorHttpClient({
			baseURL: 'https://api.example.com',
			headers: { 'X-Custom': 'value' },
			axiosOptions: {
				maxRedirects: 3,
				headers: { 'X-From-Axios': 'yes' },
			},
		})

		expect(axios.create).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: 'https://api.example.com',
				maxRedirects: 3,
				headers: expect.objectContaining({
					'X-Custom': 'value',
					'X-From-Axios': 'yes',
				}),
			})
		)
	})

	it('should register request and response interceptors', () => {
		const client = createConnectorHttpClient()

		expect(client.interceptors.request.use).toHaveBeenCalledTimes(1)
		expect(client.interceptors.response.use).toHaveBeenCalledTimes(1)

		const [reqSuccess, reqError] = (client.interceptors.request.use as jest.Mock).mock.calls[0]
		const [resSuccess, resError] = (client.interceptors.response.use as jest.Mock).mock.calls[0]

		expect(typeof reqSuccess).toBe('function')
		expect(typeof reqError).toBe('function')
		expect(typeof resSuccess).toBe('function')
		expect(typeof resError).toBe('function')
	})

	it('request interceptor should pass through config', () => {
		const client = createConnectorHttpClient()
		const [reqSuccess] = (client.interceptors.request.use as jest.Mock).mock.calls[0]

		const config = { method: 'get', url: '/test', baseURL: 'https://api.example.com' }
		const result = reqSuccess(config)
		expect(result).toBe(config)
	})

	it('request interceptor should reject on error', async () => {
		const client = createConnectorHttpClient()
		const [, reqError] = (client.interceptors.request.use as jest.Mock).mock.calls[0]

		const error = new Error('request failed')
		await expect(reqError(error)).rejects.toBe(error)
	})

	it('response interceptor should pass through response', () => {
		const client = createConnectorHttpClient()
		const [resSuccess] = (client.interceptors.response.use as jest.Mock).mock.calls[0]

		const response = { config: { method: 'get', url: '/test' }, status: 200 }
		const result = resSuccess(response)
		expect(result).toBe(response)
	})

	it('response interceptor should reject on response error', async () => {
		const client = createConnectorHttpClient()
		const [, resError] = (client.interceptors.response.use as jest.Mock).mock.calls[0]

		const error = {
			config: { method: 'get', url: '/test' },
			response: { status: 404 },
			message: 'Not Found',
		}
		await expect(resError(error)).rejects.toBe(error)
	})

	it('response interceptor should reject on network error', async () => {
		const client = createConnectorHttpClient()
		const [, resError] = (client.interceptors.response.use as jest.Mock).mock.calls[0]

		const error = { message: 'Network Error' }
		await expect(resError(error)).rejects.toBe(error)
	})
})
