/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import axios, { AxiosInstance, CreateAxiosDefaults, InternalAxiosRequestConfig } from 'axios'
import { logger } from './logger'

export type { AxiosInstance } from 'axios'

/**
 * Options for creating a connector HTTP client
 */
export interface HttpClientOptions {
	/**
	 * Base URL for all requests (e.g. 'https://api.example.com/v1')
	 */
	baseURL?: string

	/**
	 * Default headers to include on every request
	 */
	headers?: Record<string, string>

	/**
	 * Request timeout in milliseconds (default: 30000)
	 */
	timeout?: number

	/**
	 * Additional Axios configuration options
	 */
	axiosOptions?: CreateAxiosDefaults
}

/**
 * Creates a pre-configured Axios HTTP client instance for use within connectors.
 *
 * The client includes:
 * - Configurable base URL, headers, and timeout
 * - Request/response logging via the SDK's pino logger
 * - Error logging for failed requests
 *
 * @example
 * ```typescript
 * import { createConnectorHttpClient, readConfig } from '@sailpoint/connector-sdk'
 *
 * const config = await readConfig()
 * const httpClient = createConnectorHttpClient({
 *     baseURL: config.apiUrl,
 *     headers: { Authorization: `Bearer ${config.token}` },
 * })
 *
 * const response = await httpClient.get('/users')
 * ```
 *
 * @param options Configuration options for the HTTP client
 * @returns A configured Axios instance
 */
export function createConnectorHttpClient(options: HttpClientOptions = {}): AxiosInstance {
	const { baseURL, headers, timeout = 30000, axiosOptions = {} } = options

	const client = axios.create({
		...axiosOptions,
		baseURL,
		timeout,
		headers: {
			...axiosOptions.headers,
			...headers,
		},
	})

	const log = logger.child({ component: 'http-client' })

	client.interceptors.request.use(
		(config: InternalAxiosRequestConfig) => {
			log.debug({ method: config.method?.toUpperCase(), url: config.url, baseURL: config.baseURL }, 'HTTP request')
			return config
		},
		(error) => {
			log.error({ error: error.message }, 'HTTP request error')
			return Promise.reject(error)
		}
	)

	client.interceptors.response.use(
		(response) => {
			log.debug(
				{ method: response.config.method?.toUpperCase(), url: response.config.url, status: response.status },
				'HTTP response'
			)
			return response
		},
		(error) => {
			if (error.response) {
				log.error(
					{
						method: error.config?.method?.toUpperCase(),
						url: error.config?.url,
						status: error.response.status,
					},
					'HTTP response error'
				)
			} else {
				log.error({ message: error.message }, 'HTTP request failed')
			}
			return Promise.reject(error)
		}
	)

	return client
}
