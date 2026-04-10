/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import axios, { AxiosError, AxiosInstance, CreateAxiosDefaults, InternalAxiosRequestConfig } from 'axios'
import { logger } from './logger'
import { connectorCache, SDK_CACHE_PREFIX } from './cache'

export type { AxiosInstance } from 'axios'

/** Cache key prefix for auth tokens */
const AUTH_CACHE_PREFIX = `${SDK_CACHE_PREFIX}auth:`

/** Custom config property to track retry count */
const RETRY_COUNT_KEY = '__retryCount'

/** Default status codes that trigger a retry */
const DEFAULT_RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504]

/**
 * Basic authentication using username and password
 */
export interface BasicAuth {
	type: 'basic'
	username: string
	password: string
}

/**
 * Bearer token authentication using a static token
 */
export interface BearerTokenAuth {
	type: 'bearer'
	token: string
}

/**
 * API key authentication sent as a header or query parameter
 */
export interface ApiKeyAuth {
	type: 'apiKey'
	/**
	 * Where to send the API key: 'header' or 'query'
	 */
	in: 'header' | 'query'
	/**
	 * Name of the header or query parameter (e.g. 'X-API-Key', 'api_key')
	 */
	name: string
	value: string
}

/**
 * OAuth2 Client Credentials grant. Automatically fetches and refreshes access tokens.
 */
export interface OAuth2ClientCredentialsAuth {
	type: 'oauth2ClientCredentials'
	/**
	 * Token endpoint URL (e.g. 'https://auth.example.com/oauth/token')
	 */
	tokenUrl: string
	clientId: string
	clientSecret: string
	/**
	 * Optional scopes to request
	 */
	scope?: string
	/**
	 * How to send credentials: 'body' (form post) or 'header' (Basic auth header).
	 * Defaults to 'body'.
	 */
	credentialPlacement?: 'body' | 'header'
}

export type AuthConfig = BasicAuth | BearerTokenAuth | ApiKeyAuth | OAuth2ClientCredentialsAuth

/**
 * Configuration for automatic request retry with exponential backoff.
 */
export interface RetryConfig {
	/**
	 * Maximum number of retry attempts. Set to 0 to disable retries.
	 * Default: 3
	 */
	maxRetries?: number

	/**
	 * Base delay in milliseconds for exponential backoff. The actual delay is
	 * `baseDelay * 2^(attempt - 1)` plus jitter.
	 * Default: 1000
	 */
	baseDelay?: number

	/**
	 * Maximum delay in milliseconds between retries.
	 * Default: 30000
	 */
	maxDelay?: number

	/**
	 * HTTP status codes that should trigger a retry.
	 * Default: [429, 500, 502, 503, 504]
	 */
	retryableStatusCodes?: number[]

	/**
	 * Whether to retry on network errors (no response received).
	 * Default: true
	 */
	retryOnNetworkError?: boolean
}

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
	 * Authentication configuration. Supports basic, bearer, apiKey, and oauth2ClientCredentials.
	 */
	auth?: AuthConfig

	/**
	 * Retry configuration. Enabled by default with 3 retries and exponential backoff.
	 * Set to `false` to disable retries entirely.
	 */
	retry?: RetryConfig | false

	/**
	 * Additional Axios configuration options
	 */
	axiosOptions?: CreateAxiosDefaults
}

/**
 * Builds a deterministic cache key from the auth config so that the same credentials
 * always resolve to the same cached token, even across multiple `createConnectorHttpClient` calls.
 */
function authCacheKey(auth: AuthConfig): string {
	switch (auth.type) {
		case 'oauth2ClientCredentials':
			return `${AUTH_CACHE_PREFIX}oauth2:${auth.tokenUrl}:${auth.clientId}`
		default:
			return `${AUTH_CACHE_PREFIX}${auth.type}`
	}
}

// Tracks in-flight token fetches to deduplicate concurrent requests
const inflightTokenRequests = new Map<string, Promise<string>>()

/**
 * Fetches an OAuth2 Client Credentials token, using the shared cache and deduplicating
 * concurrent requests.
 */
async function getOAuth2Token(
	config: OAuth2ClientCredentialsAuth,
	cacheKey: string,
	log: ReturnType<typeof logger.child>
): Promise<string> {
	// Check the shared cache first
	const cached = connectorCache.get<string>(cacheKey)
	if (cached) {
		return cached
	}

	// Deduplicate concurrent token requests
	const inflight = inflightTokenRequests.get(cacheKey)
	if (inflight) {
		return inflight
	}

	const promise = fetchOAuth2Token(config, cacheKey, log)
	inflightTokenRequests.set(cacheKey, promise)
	try {
		return await promise
	} finally {
		inflightTokenRequests.delete(cacheKey)
	}
}

async function fetchOAuth2Token(
	config: OAuth2ClientCredentialsAuth,
	cacheKey: string,
	log: ReturnType<typeof logger.child>
): Promise<string> {
	log.debug({ tokenUrl: config.tokenUrl }, 'Fetching OAuth2 access token')

	const params = new URLSearchParams()
	params.append('grant_type', 'client_credentials')
	if (config.scope) {
		params.append('scope', config.scope)
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/x-www-form-urlencoded',
	}

	if (config.credentialPlacement === 'header') {
		const encoded = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
		headers['Authorization'] = `Basic ${encoded}`
	} else {
		params.append('client_id', config.clientId)
		params.append('client_secret', config.clientSecret)
	}

	const response = await axios.post(config.tokenUrl, params.toString(), { headers })
	const { access_token, expires_in } = response.data

	// Cache with TTL. Use a 30s buffer so the token is refreshed before it actually expires.
	const ttlSeconds = Math.max((expires_in || 3600) - 30, 0)
	connectorCache.set(cacheKey, access_token, ttlSeconds)

	log.debug({ expiresIn: expires_in }, 'OAuth2 access token acquired')
	return access_token
}

/**
 * Parses the Retry-After header value into milliseconds to wait.
 * Supports both seconds (integer) and HTTP-date formats.
 * Returns undefined if the header is missing or unparseable.
 */
export function parseRetryAfter(headerValue: string | undefined | null): number | undefined {
	if (!headerValue) {
		return undefined
	}

	// Try parsing as integer seconds
	const seconds = Number(headerValue)
	if (!isNaN(seconds) && seconds >= 0) {
		return seconds * 1000
	}

	// Try parsing as HTTP-date
	const date = new Date(headerValue)
	if (!isNaN(date.getTime())) {
		const delay = date.getTime() - Date.now()
		return Math.max(delay, 0)
	}

	return undefined
}

/**
 * Calculates the delay for a retry attempt using exponential backoff with jitter.
 */
export function calculateRetryDelay(attempt: number, baseDelay: number, maxDelay: number): number {
	const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
	const jitter = Math.random() * baseDelay * 0.5
	return Math.min(exponentialDelay + jitter, maxDelay)
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a pre-configured Axios HTTP client instance for use within connectors.
 *
 * The client includes:
 * - Configurable base URL, headers, and timeout
 * - Built-in authentication (basic, bearer, apiKey, oauth2ClientCredentials)
 * - Automatic retry with exponential backoff (429, 5xx, network errors)
 * - Token caching via the shared `connectorCache` (persists across warm invocations)
 * - Request/response logging via the SDK's pino logger
 * - Error logging for failed requests
 *
 * @example Basic auth
 * ```typescript
 * const httpClient = createConnectorHttpClient({
 *     baseURL: config.apiUrl,
 *     auth: { type: 'basic', username: config.username, password: config.password },
 * })
 * ```
 *
 * @example Bearer token
 * ```typescript
 * const httpClient = createConnectorHttpClient({
 *     baseURL: config.apiUrl,
 *     auth: { type: 'bearer', token: config.token },
 * })
 * ```
 *
 * @example API key
 * ```typescript
 * const httpClient = createConnectorHttpClient({
 *     baseURL: config.apiUrl,
 *     auth: { type: 'apiKey', in: 'header', name: 'X-API-Key', value: config.apiKey },
 * })
 * ```
 *
 * @example OAuth2 Client Credentials (automatic token management)
 * ```typescript
 * const httpClient = createConnectorHttpClient({
 *     baseURL: config.apiUrl,
 *     auth: {
 *         type: 'oauth2ClientCredentials',
 *         tokenUrl: config.tokenUrl,
 *         clientId: config.clientId,
 *         clientSecret: config.clientSecret,
 *         scope: 'read write',
 *     },
 * })
 * ```
 *
 * @example Custom retry configuration
 * ```typescript
 * const httpClient = createConnectorHttpClient({
 *     baseURL: config.apiUrl,
 *     retry: { maxRetries: 5, baseDelay: 2000 },
 * })
 * ```
 *
 * @example Disable retries
 * ```typescript
 * const httpClient = createConnectorHttpClient({
 *     baseURL: config.apiUrl,
 *     retry: false,
 * })
 * ```
 *
 * @param options Configuration options for the HTTP client
 * @returns A configured Axios instance
 */
export function createConnectorHttpClient(options: HttpClientOptions = {}): AxiosInstance {
	const { baseURL, headers, timeout = 30000, auth, retry, axiosOptions = {} } = options

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

	// Set up authentication interceptor
	if (auth) {
		switch (auth.type) {
			case 'basic': {
				const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64')
				client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
					config.headers.set('Authorization', `Basic ${encoded}`)
					return config
				})
				break
			}

			case 'bearer': {
				client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
					config.headers.set('Authorization', `Bearer ${auth.token}`)
					return config
				})
				break
			}

			case 'apiKey': {
				client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
					if (auth.in === 'header') {
						config.headers.set(auth.name, auth.value)
					} else {
						config.params = { ...config.params, [auth.name]: auth.value }
					}
					return config
				})
				break
			}

			case 'oauth2ClientCredentials': {
				const cacheKey = authCacheKey(auth)
				client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
					const token = await getOAuth2Token(auth, cacheKey, log)
					config.headers.set('Authorization', `Bearer ${token}`)
					return config
				})
				break
			}
		}
	}

	// Logging interceptors
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

	// Retry interceptor (added after logging so retries are logged)
	if (retry !== false) {
		const retryConfig: Required<RetryConfig> = {
			maxRetries: retry?.maxRetries ?? 3,
			baseDelay: retry?.baseDelay ?? 1000,
			maxDelay: retry?.maxDelay ?? 30000,
			retryableStatusCodes: retry?.retryableStatusCodes ?? DEFAULT_RETRYABLE_STATUS_CODES,
			retryOnNetworkError: retry?.retryOnNetworkError ?? true,
		}

		client.interceptors.response.use(undefined, async (error: AxiosError) => {
			const config = error.config
			if (!config) {
				return Promise.reject(error)
			}

			const retryCount: number = (config as any)[RETRY_COUNT_KEY] || 0

			if (retryCount >= retryConfig.maxRetries) {
				return Promise.reject(error)
			}

			const status = error.response?.status
			const isRetryable = status
				? retryConfig.retryableStatusCodes.includes(status)
				: retryConfig.retryOnNetworkError && !error.response

			if (!isRetryable) {
				return Promise.reject(error)
			}

			const attempt = retryCount + 1

			// For 429, prefer Retry-After header
			let delay: number
			if (status === 429) {
				const retryAfterHeader = error.response?.headers?.['retry-after']
				const retryAfterMs = parseRetryAfter(retryAfterHeader)
				delay = retryAfterMs ?? calculateRetryDelay(attempt, retryConfig.baseDelay, retryConfig.maxDelay)
			} else {
				delay = calculateRetryDelay(attempt, retryConfig.baseDelay, retryConfig.maxDelay)
			}

			log.info(
				{
					attempt,
					maxRetries: retryConfig.maxRetries,
					status,
					delay: Math.round(delay),
					url: config.url,
				},
				'Retrying request'
			)

			;(config as any)[RETRY_COUNT_KEY] = attempt
			await sleep(delay)
			return client.request(config)
		})
	}

	return client
}
