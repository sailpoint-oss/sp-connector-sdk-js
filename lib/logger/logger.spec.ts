import { getAsyncContextLogFields, logLevel } from './logger'
import { contextState } from '../async-context'

describe('logLevel', () => {
    const originalConfig = process.env['CONNECTOR_CONFIG']

    afterEach(() => {
        if (originalConfig === undefined) {
            delete process.env['CONNECTOR_CONFIG']
        } else {
            process.env['CONNECTOR_CONFIG'] = originalConfig
        }
    })

    test('returns info when CONNECTOR_CONFIG is not set', () => {
        delete process.env['CONNECTOR_CONFIG']
        expect(logLevel()).toBe('info')
    })

    test('returns debug when base64 config has spConnDebugLoggingEnabled true', () => {
        const payload = JSON.stringify({ spConnDebugLoggingEnabled: true })
        process.env['CONNECTOR_CONFIG'] = Buffer.from(payload, 'utf8').toString('base64')
        expect(logLevel()).toBe('debug')
    })

    test('returns info when spConnDebugLoggingEnabled is false', () => {
        const payload = JSON.stringify({ spConnDebugLoggingEnabled: false })
        process.env['CONNECTOR_CONFIG'] = Buffer.from(payload, 'utf8').toString('base64')
        expect(logLevel()).toBe('info')
    })

    test('returns info when spConnDebugLoggingEnabled is absent', () => {
        const payload = JSON.stringify({ other: true })
        process.env['CONNECTOR_CONFIG'] = Buffer.from(payload, 'utf8').toString('base64')
        expect(logLevel()).toBe('info')
    })
})

describe('getAsyncContextLogFields', () => {
    test('returns empty object when async context is not set', () => {
        expect(getAsyncContextLogFields()).toEqual({})
    })

    test('returns connector context fields when inside contextState.run', async () => {
        const ctx = {
            id: 'conn-1',
            version: 2,
            invocationId: 'inv-1',
            requestId: 'req-1',
            commandType: 'std:account:list',
            reloadConfig: async () => ({}),
            assumeAwsRole: async () => ({} as any),
            getOAuth2AccessToken: async () => ({} as any),
        }

        await new Promise<void>((resolve) => {
            contextState.run(ctx, () => {
                expect(getAsyncContextLogFields()).toEqual({
                    id: 'conn-1',
                    version: 2,
                    invocationId: 'inv-1',
                    requestId: 'req-1',
                    commandType: 'std:account:list',
                })
                resolve()
            })
        })
    })
})
