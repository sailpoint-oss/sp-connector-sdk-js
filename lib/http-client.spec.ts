/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import axios from 'axios'
import { createConnectorHttpClient, parseRetryAfter, calculateRetryDelay } from './http-client'
import { connectorCache } from './cache'

// Track interceptor callbacks per instance so we can invoke them in tests
let interceptorCallbacks: {
	request: Array<{ success: Function; error: Function }>
	response: Array<{ success: Function; error: Function }>
}
let mockClientRequest: jest.Mock

jest.mock('axios', () => {
	const createMock = jest.fn(() => {
		interceptorCallbacks = {
			request: [],
			response: [],
		}
		mockClientRequest = jest.fn()
		const interceptors = {
			request: {
				use: jest.fn((success: Function, error?: Function) => {
					interceptorCallbacks.request.push({ success, error: error || (() => {}) })
				}),
			},
			response: {
				use: jest.fn((success: Function, error?: Function) => {
					interceptorCallbacks.response.push({ success, error: error || (() => {}) })
				}),
			},
		}
		return {
			interceptors,
			defaults: { headers: { common: {} } },
			request: mockClientRequest,
		}
	})

	return {
		__esModule: true,
		default: {
			create: createMock,
			post: jest.fn(),
		},
	}
})

// Helper to create a mock InternalAxiosRequestConfig with headers.set
function mockRequestConfig(overrides: Record<string, any> = {}) {
	const headersMap: Record<string, string> = {}
	return {
		method: 'get',
		url: '/test',
		baseURL: 'https://api.example.com',
		headers: {
			set: jest.fn((key: string, value: string) => {
				headersMap[key] = value
			}),
			_map: headersMap,
		},
		params: {},
		...overrides,
	}
}

describe('createConnectorHttpClient', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		connectorCache.clear(true)
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

	describe('logging interceptors', () => {
		it('request interceptor should pass through config', () => {
			createConnectorHttpClient()
			const loggingInterceptor = interceptorCallbacks.request[interceptorCallbacks.request.length - 1]

			const config = { method: 'get', url: '/test', baseURL: 'https://api.example.com' }
			const result = loggingInterceptor.success(config)
			expect(result).toBe(config)
		})

		it('request interceptor should reject on error', async () => {
			createConnectorHttpClient()
			const loggingInterceptor = interceptorCallbacks.request[interceptorCallbacks.request.length - 1]

			const error = new Error('request failed')
			await expect(loggingInterceptor.error(error)).rejects.toBe(error)
		})

		it('response interceptor should pass through response', () => {
			createConnectorHttpClient()
			// Logging is the first response interceptor (index 0), retry is index 1
			const loggingInterceptor = interceptorCallbacks.response[0]

			const response = { config: { method: 'get', url: '/test' }, status: 200 }
			const result = loggingInterceptor.success(response)
			expect(result).toBe(response)
		})

		it('response interceptor should reject on response error', async () => {
			createConnectorHttpClient()
			const loggingInterceptor = interceptorCallbacks.response[0]

			const error = {
				config: { method: 'get', url: '/test' },
				response: { status: 404 },
				message: 'Not Found',
			}
			await expect(loggingInterceptor.error(error)).rejects.toBe(error)
		})

		it('response interceptor should reject on network error', async () => {
			createConnectorHttpClient()
			const loggingInterceptor = interceptorCallbacks.response[0]

			const error = { message: 'Network Error' }
			await expect(loggingInterceptor.error(error)).rejects.toBe(error)
		})
	})

	describe('basic auth', () => {
		it('should set Authorization header with base64 encoded credentials', () => {
			createConnectorHttpClient({
				auth: { type: 'basic', username: 'user', password: 'pass' },
			})

			// auth + logging = 2 request interceptors
			expect(interceptorCallbacks.request.length).toBe(2)
			const authInterceptor = interceptorCallbacks.request[0]

			const config = mockRequestConfig()
			authInterceptor.success(config)

			const expected = Buffer.from('user:pass').toString('base64')
			expect(config.headers.set).toHaveBeenCalledWith('Authorization', `Basic ${expected}`)
		})
	})

	describe('bearer auth', () => {
		it('should set Authorization header with bearer token', () => {
			createConnectorHttpClient({
				auth: { type: 'bearer', token: 'my-token-123' },
			})

			const authInterceptor = interceptorCallbacks.request[0]

			const config = mockRequestConfig()
			authInterceptor.success(config)

			expect(config.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer my-token-123')
		})
	})

	describe('apiKey auth', () => {
		it('should set API key as header', () => {
			createConnectorHttpClient({
				auth: { type: 'apiKey', in: 'header', name: 'X-API-Key', value: 'key-123' },
			})

			const authInterceptor = interceptorCallbacks.request[0]

			const config = mockRequestConfig()
			authInterceptor.success(config)

			expect(config.headers.set).toHaveBeenCalledWith('X-API-Key', 'key-123')
		})

		it('should set API key as query parameter', () => {
			createConnectorHttpClient({
				auth: { type: 'apiKey', in: 'query', name: 'api_key', value: 'key-456' },
			})

			const authInterceptor = interceptorCallbacks.request[0]

			const config = mockRequestConfig({ params: { existing: 'param' } })
			authInterceptor.success(config)

			expect(config.params).toEqual({ existing: 'param', api_key: 'key-456' })
		})
	})

	describe('oauth2 client credentials auth', () => {
		const oauthConfig = {
			type: 'oauth2ClientCredentials' as const,
			tokenUrl: 'https://auth.example.com/token',
			clientId: 'my-client',
			clientSecret: 'my-secret',
		}

		it('should fetch token and set Authorization header with credentials in body', async () => {
			;(axios.post as jest.Mock).mockResolvedValue({
				data: { access_token: 'oauth-token-abc', expires_in: 3600 },
			})

			createConnectorHttpClient({
				auth: { ...oauthConfig, scope: 'read write' },
			})

			const authInterceptor = interceptorCallbacks.request[0]
			const config = mockRequestConfig()
			await authInterceptor.success(config)

			expect(axios.post).toHaveBeenCalledWith(
				'https://auth.example.com/token',
				expect.stringContaining('grant_type=client_credentials'),
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Type': 'application/x-www-form-urlencoded',
					}),
				})
			)

			const postBody = (axios.post as jest.Mock).mock.calls[0][1]
			expect(postBody).toContain('client_id=my-client')
			expect(postBody).toContain('client_secret=my-secret')
			expect(postBody).toContain('scope=read+write')

			expect(config.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer oauth-token-abc')
		})

		it('should send credentials in Authorization header when credentialPlacement is header', async () => {
			;(axios.post as jest.Mock).mockResolvedValue({
				data: { access_token: 'oauth-token-header', expires_in: 3600 },
			})

			createConnectorHttpClient({
				auth: { ...oauthConfig, credentialPlacement: 'header' },
			})

			const authInterceptor = interceptorCallbacks.request[0]
			const config = mockRequestConfig()
			await authInterceptor.success(config)

			const expectedBasic = Buffer.from('my-client:my-secret').toString('base64')
			const postHeaders = (axios.post as jest.Mock).mock.calls[0][2].headers
			expect(postHeaders['Authorization']).toBe(`Basic ${expectedBasic}`)

			const postBody = (axios.post as jest.Mock).mock.calls[0][1]
			expect(postBody).not.toContain('client_id')
			expect(postBody).not.toContain('client_secret')
		})

		it('should cache token in connectorCache and reuse across requests', async () => {
			;(axios.post as jest.Mock).mockResolvedValue({
				data: { access_token: 'cached-token', expires_in: 3600 },
			})

			createConnectorHttpClient({ auth: oauthConfig })

			const authInterceptor = interceptorCallbacks.request[0]

			// First request - fetches token
			const config1 = mockRequestConfig()
			await authInterceptor.success(config1)
			expect(axios.post).toHaveBeenCalledTimes(1)

			// Second request - uses cached token
			const config2 = mockRequestConfig()
			await authInterceptor.success(config2)
			expect(axios.post).toHaveBeenCalledTimes(1)

			expect(config2.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer cached-token')
		})

		it('should reuse cached token across separate client instances', async () => {
			;(axios.post as jest.Mock).mockResolvedValue({
				data: { access_token: 'shared-token', expires_in: 3600 },
			})

			// First client fetches the token
			createConnectorHttpClient({ auth: oauthConfig })
			const authInterceptor1 = interceptorCallbacks.request[0]
			const config1 = mockRequestConfig()
			await authInterceptor1.success(config1)
			expect(axios.post).toHaveBeenCalledTimes(1)

			// Second client with same credentials should use the cached token
			createConnectorHttpClient({ auth: oauthConfig })
			const authInterceptor2 = interceptorCallbacks.request[0]
			const config2 = mockRequestConfig()
			await authInterceptor2.success(config2)
			expect(axios.post).toHaveBeenCalledTimes(1) // still 1

			expect(config2.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer shared-token')
		})

		it('should refresh token when cache entry expires', async () => {
			jest.useFakeTimers()

			;(axios.post as jest.Mock)
				.mockResolvedValueOnce({
					data: { access_token: 'token-1', expires_in: 60 },
				})
				.mockResolvedValueOnce({
					data: { access_token: 'token-2', expires_in: 3600 },
				})

			createConnectorHttpClient({ auth: oauthConfig })

			const authInterceptor = interceptorCallbacks.request[0]

			// First request
			const config1 = mockRequestConfig()
			await authInterceptor.success(config1)
			expect(config1.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer token-1')

			// Advance time past the TTL (60s - 30s buffer = 30s TTL)
			jest.advanceTimersByTime(30000)

			// Second request - token expired, should fetch new one
			const config2 = mockRequestConfig()
			await authInterceptor.success(config2)
			expect(axios.post).toHaveBeenCalledTimes(2)
			expect(config2.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer token-2')

			jest.useRealTimers()
		})

		it('should deduplicate concurrent token requests', async () => {
			let resolveToken: Function
			;(axios.post as jest.Mock).mockImplementation(
				() =>
					new Promise((resolve) => {
						resolveToken = () => resolve({ data: { access_token: 'deduped-token', expires_in: 3600 } })
					})
			)

			createConnectorHttpClient({ auth: oauthConfig })

			const authInterceptor = interceptorCallbacks.request[0]

			const config1 = mockRequestConfig()
			const config2 = mockRequestConfig()
			const promise1 = authInterceptor.success(config1)
			const promise2 = authInterceptor.success(config2)

			resolveToken!()
			await promise1
			await promise2

			expect(axios.post).toHaveBeenCalledTimes(1)
			expect(config1.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer deduped-token')
			expect(config2.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer deduped-token')
		})

		it('should default expires_in to 3600 if not provided', async () => {
			;(axios.post as jest.Mock).mockResolvedValue({
				data: { access_token: 'no-expiry-token' },
			})

			createConnectorHttpClient({ auth: oauthConfig })

			const authInterceptor = interceptorCallbacks.request[0]
			const config = mockRequestConfig()
			await authInterceptor.success(config)

			expect(config.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer no-expiry-token')

			// Second request should use cached token
			const config2 = mockRequestConfig()
			await authInterceptor.success(config2)
			expect(axios.post).toHaveBeenCalledTimes(1)
		})
	})

	describe('no auth', () => {
		it('should not add auth interceptor when auth is not configured', () => {
			createConnectorHttpClient()

			// 1 request (logging) + 2 response (logging + retry)
			expect(interceptorCallbacks.request.length).toBe(1)
			expect(interceptorCallbacks.response.length).toBe(2)
		})
	})

	describe('retry', () => {
		// Helper to get the retry interceptor (last response interceptor)
		function getRetryInterceptor() {
			return interceptorCallbacks.response[interceptorCallbacks.response.length - 1]
		}

		it('should register retry interceptor by default', () => {
			createConnectorHttpClient()

			// logging + retry = 2 response interceptors
			expect(interceptorCallbacks.response.length).toBe(2)
		})

		it('should not register retry interceptor when retry is false', () => {
			createConnectorHttpClient({ retry: false })

			// Only logging interceptor
			expect(interceptorCallbacks.response.length).toBe(1)
		})

		it('should retry on 429 status', async () => {
			jest.useFakeTimers()

			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				response: { status: 429, headers: {} },
				message: 'Too Many Requests',
			}

			mockClientRequest.mockResolvedValue({ status: 200 })

			const promise = retryInterceptor.error(error)
			await jest.advanceTimersByTimeAsync(2000)
			await promise

			expect(mockClientRequest).toHaveBeenCalledWith(
				expect.objectContaining({ __retryCount: 1 })
			)

			jest.useRealTimers()
		})

		it('should retry on 500 status', async () => {
			jest.useFakeTimers()

			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				response: { status: 500, headers: {} },
				message: 'Internal Server Error',
			}

			mockClientRequest.mockResolvedValue({ status: 200 })

			const promise = retryInterceptor.error(error)
			await jest.advanceTimersByTimeAsync(2000)
			await promise

			expect(mockClientRequest).toHaveBeenCalled()

			jest.useRealTimers()
		})

		it('should retry on 502 status', async () => {
			jest.useFakeTimers()

			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				response: { status: 502, headers: {} },
				message: 'Bad Gateway',
			}

			mockClientRequest.mockResolvedValue({ status: 200 })

			const promise = retryInterceptor.error(error)
			await jest.advanceTimersByTimeAsync(2000)
			await promise

			expect(mockClientRequest).toHaveBeenCalled()

			jest.useRealTimers()
		})

		it('should retry on 503 status', async () => {
			jest.useFakeTimers()

			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				response: { status: 503, headers: {} },
				message: 'Service Unavailable',
			}

			mockClientRequest.mockResolvedValue({ status: 200 })

			const promise = retryInterceptor.error(error)
			await jest.advanceTimersByTimeAsync(2000)
			await promise

			expect(mockClientRequest).toHaveBeenCalled()

			jest.useRealTimers()
		})

		it('should retry on network errors', async () => {
			jest.useFakeTimers()

			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				message: 'Network Error',
				// No response property = network error
			}

			mockClientRequest.mockResolvedValue({ status: 200 })

			const promise = retryInterceptor.error(error)
			await jest.advanceTimersByTimeAsync(2000)
			await promise

			expect(mockClientRequest).toHaveBeenCalled()

			jest.useRealTimers()
		})

		it('should not retry on 400 status', async () => {
			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				response: { status: 400, headers: {} },
				message: 'Bad Request',
			}

			await expect(retryInterceptor.error(error)).rejects.toBe(error)
			expect(mockClientRequest).not.toHaveBeenCalled()
		})

		it('should not retry on 401 status', async () => {
			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				response: { status: 401, headers: {} },
				message: 'Unauthorized',
			}

			await expect(retryInterceptor.error(error)).rejects.toBe(error)
			expect(mockClientRequest).not.toHaveBeenCalled()
		})

		it('should not retry on 404 status', async () => {
			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				response: { status: 404, headers: {} },
				message: 'Not Found',
			}

			await expect(retryInterceptor.error(error)).rejects.toBe(error)
			expect(mockClientRequest).not.toHaveBeenCalled()
		})

		it('should stop retrying after maxRetries', async () => {
			createConnectorHttpClient({ retry: { maxRetries: 2 } })
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test', __retryCount: 2 }
			const error = {
				config,
				response: { status: 500, headers: {} },
				message: 'Internal Server Error',
			}

			await expect(retryInterceptor.error(error)).rejects.toBe(error)
			expect(mockClientRequest).not.toHaveBeenCalled()
		})

		it('should respect Retry-After header (seconds) on 429', async () => {
			jest.useFakeTimers()

			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				response: { status: 429, headers: { 'retry-after': '5' } },
				message: 'Too Many Requests',
			}

			mockClientRequest.mockResolvedValue({ status: 200 })

			const promise = retryInterceptor.error(error)

			// Should not have retried before 5 seconds
			await jest.advanceTimersByTimeAsync(4900)
			expect(mockClientRequest).not.toHaveBeenCalled()

			// Should retry after 5 seconds
			await jest.advanceTimersByTimeAsync(200)
			await promise

			expect(mockClientRequest).toHaveBeenCalled()

			jest.useRealTimers()
		})

		it('should respect Retry-After header (HTTP-date) on 429', async () => {
			jest.useFakeTimers()
			const futureDate = new Date(Date.now() + 3000).toUTCString()

			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				response: { status: 429, headers: { 'retry-after': futureDate } },
				message: 'Too Many Requests',
			}

			mockClientRequest.mockResolvedValue({ status: 200 })

			const promise = retryInterceptor.error(error)
			await jest.advanceTimersByTimeAsync(3100)
			await promise

			expect(mockClientRequest).toHaveBeenCalled()

			jest.useRealTimers()
		})

		it('should reject when error has no config', async () => {
			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const error = { message: 'No config' }

			await expect(retryInterceptor.error(error)).rejects.toBe(error)
			expect(mockClientRequest).not.toHaveBeenCalled()
		})

		it('should not retry network errors when retryOnNetworkError is false', async () => {
			createConnectorHttpClient({ retry: { retryOnNetworkError: false } })
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				message: 'Network Error',
			}

			await expect(retryInterceptor.error(error)).rejects.toBe(error)
			expect(mockClientRequest).not.toHaveBeenCalled()
		})

		it('should use custom retryableStatusCodes', async () => {
			jest.useFakeTimers()

			createConnectorHttpClient({ retry: { retryableStatusCodes: [418] } })
			const retryInterceptor = getRetryInterceptor()

			// 418 should now be retryable
			const config1 = { method: 'get', url: '/test' }
			const error1 = {
				config: config1,
				response: { status: 418, headers: {} },
				message: "I'm a teapot",
			}

			mockClientRequest.mockResolvedValue({ status: 200 })

			const promise = retryInterceptor.error(error1)
			await jest.advanceTimersByTimeAsync(2000)
			await promise

			expect(mockClientRequest).toHaveBeenCalled()

			jest.useRealTimers()
		})

		it('should increment retry count on each attempt', async () => {
			jest.useFakeTimers()

			createConnectorHttpClient()
			const retryInterceptor = getRetryInterceptor()

			const config = { method: 'get', url: '/test' }
			const error = {
				config,
				response: { status: 500, headers: {} },
				message: 'Server Error',
			}

			mockClientRequest.mockResolvedValue({ status: 200 })

			const promise = retryInterceptor.error(error)
			await jest.advanceTimersByTimeAsync(2000)
			await promise

			expect((config as any).__retryCount).toBe(1)

			jest.useRealTimers()
		})
	})
})

describe('parseRetryAfter', () => {
	it('should return undefined for null/undefined', () => {
		expect(parseRetryAfter(null)).toBeUndefined()
		expect(parseRetryAfter(undefined)).toBeUndefined()
	})

	it('should parse integer seconds', () => {
		expect(parseRetryAfter('5')).toBe(5000)
		expect(parseRetryAfter('0')).toBe(0)
		expect(parseRetryAfter('120')).toBe(120000)
	})

	it('should parse HTTP-date format', () => {
		const futureDate = new Date(Date.now() + 10000).toUTCString()
		const result = parseRetryAfter(futureDate)
		expect(result).toBeDefined()
		expect(result!).toBeGreaterThan(0)
		expect(result!).toBeLessThanOrEqual(10100)
	})

	it('should return 0 for past dates', () => {
		const pastDate = new Date(Date.now() - 10000).toUTCString()
		expect(parseRetryAfter(pastDate)).toBe(0)
	})

	it('should return undefined for unparseable values', () => {
		expect(parseRetryAfter('not-a-date-or-number')).toBeUndefined()
	})
})

describe('calculateRetryDelay', () => {
	it('should increase exponentially', () => {
		// Use a fixed seed by mocking Math.random to remove jitter
		jest.spyOn(Math, 'random').mockReturnValue(0)

		const delay1 = calculateRetryDelay(1, 1000, 30000)
		const delay2 = calculateRetryDelay(2, 1000, 30000)
		const delay3 = calculateRetryDelay(3, 1000, 30000)

		expect(delay1).toBe(1000) // 1000 * 2^0 = 1000
		expect(delay2).toBe(2000) // 1000 * 2^1 = 2000
		expect(delay3).toBe(4000) // 1000 * 2^2 = 4000

		jest.spyOn(Math, 'random').mockRestore()
	})

	it('should cap at maxDelay', () => {
		jest.spyOn(Math, 'random').mockReturnValue(0)

		const delay = calculateRetryDelay(10, 1000, 5000)
		expect(delay).toBe(5000)

		jest.spyOn(Math, 'random').mockRestore()
	})

	it('should add jitter', () => {
		jest.spyOn(Math, 'random').mockReturnValue(1) // max jitter

		const delay = calculateRetryDelay(1, 1000, 30000)
		// 1000 + (1 * 1000 * 0.5) = 1500
		expect(delay).toBe(1500)

		jest.spyOn(Math, 'random').mockRestore()
	})
})
