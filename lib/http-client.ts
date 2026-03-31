/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import axios, { AxiosInstance, CreateAxiosDefaults, InternalAxiosRequestConfig } from 'axios'
import { logger } from './logger'
import { connectorCache, SDK_CACHE_PREFIX } from './cache'

export type { AxiosInstance } from 'axios'

/** Cache key prefix for auth tokens */
const AUTH_CACHE_PREFIX = `${SDK_CACHE_PREFIX}auth:`

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
 * Creates a pre-configured Axios HTTP client instance for use within connectors.
 *
 * The client includes:
 * - Configurable base URL, headers, and timeout
 * - Built-in authentication (basic, bearer, apiKey, oauth2ClientCredentials)
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
 * @param options Configuration options for the HTTP client
 * @returns A configured Axios instance
 */
export function createConnectorHttpClient(options: HttpClientOptions = {}): AxiosInstance {
	const { baseURL, headers, timeout = 30000, auth, axiosOptions = {} } = options

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

	return client
}
