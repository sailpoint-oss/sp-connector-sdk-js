/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import {
	CommandHandler,
	Context,
	StdAccountCreateHandler,
	StdAccountDeleteHandler,
	StdAccountDisableHandler,
	StdAccountDiscoverSchemaHandler,
	StdAccountEnableHandler,
	StdAccountListHandler,
	StdAccountReadHandler,
	StdAccountUnlockHandler,
	StdAccountUpdateHandler,
	StdEntitlementListHandler,
	StdEntitlementReadHandler,
	StdTestConnectionHandler,
	StdChangePasswordHandler,
} from './connector-handler'
import { StdSpecReadDefaultHandler } from './connector-spec'
import { StandardCommand } from './commands'
import { RawResponse, ResponseStream, ResponseType } from './response'
import { Transform, TransformCallback, Writable } from 'stream'
import { contextState } from './async-context';
import { ConnectorCustomizer, CustomizerType as CustomizerType } from './connector-customizer'
import { ConnectorCustomizerHandler } from './connector-customizer-handler'

const SDK_VERSION = 1

/**
 * Connector to build by attaching handlers for supported commands.
 */
export class Connector {
	public static readonly SDK_VERSION = SDK_VERSION
	private readonly _sdkVersion = Connector.SDK_VERSION
	private readonly _handlers: Map<string, CommandHandler>

	constructor() {
		this._handlers = new Map<string, CommandHandler>()
		this.command(StandardCommand.StdSpecRead, StdSpecReadDefaultHandler)
	}

	/**
	 * Get this Connector SDK's major version
	 */
	get sdkVersion(): number {
		return this._sdkVersion
	}

	/**
	 * Get the map of command handlers
	 */
	get handlers(): Map<string, CommandHandler> {
		return this._handlers
	}

	/**
	 * Add a handler for 'std:account:create' command
	 * @param handler handler
	 */
	stdAccountCreate(handler: StdAccountCreateHandler): this {
		return this.command(StandardCommand.StdAccountCreate, handler)
	}

	/**
	 * Add a handler for 'std:account:delete' command
	 * @param handler handler
	 */
	stdAccountDelete(handler: StdAccountDeleteHandler): this {
		return this.command(StandardCommand.StdAccountDelete, handler)
	}

	/**
	 * Add a handler for 'std:account:delete' command
	 * @param handler handler
	 */
	stdAccountDisable(handler: StdAccountDisableHandler): this {
		return this.command(StandardCommand.StdAccountDisable, handler)
	}

	/**
	 * Add a handler for 'std:account:discover-schema' command
	 * @param handler handler
	 */
	 stdAccountDiscoverSchema(handler: StdAccountDiscoverSchemaHandler): this {
		return this.command(StandardCommand.StdAccountDiscoverSchema, handler)
	}

	/**
	 * Add a handler for 'std:account:enable' command
	 * @param handler handler
	 */
	stdAccountEnable(handler: StdAccountEnableHandler): this {
		return this.command(StandardCommand.StdAccountEnable, handler)
	}

	/**
	 * Add a handler for 'std:account:list' command
	 * @param handler handler
	 */
	stdAccountList(handler: StdAccountListHandler): this {
		return this.command(StandardCommand.StdAccountList, handler)
	}

	/**
	 * Add a handler for 'std:account:read' command
	 * @param handler handler
	 */
	stdAccountRead(handler: StdAccountReadHandler): this {
		return this.command(StandardCommand.StdAccountRead, handler)
	}

	/**
	 * Add a handler for 'std:account:unlock' command
	 * @param handler handler
	 */
	stdAccountUnlock(handler: StdAccountUnlockHandler): this {
		return this.command(StandardCommand.StdAccountUnlock, handler)
	}

	/**
	 * Add a handler for 'std:account:update' command
	 * @param handler handler
	 */
	stdAccountUpdate(handler: StdAccountUpdateHandler): this {
		return this.command(StandardCommand.StdAccountUpdate, handler)
	}

	/**
	 * Add a handler for 'std:entitlement:list' command
	 * @param handler handler
	 */
	stdEntitlementList(handler: StdEntitlementListHandler): this {
		return this.command(StandardCommand.StdEntitlementList, handler)
	}

	/**
	 * Add a handler for 'std:entitlement:read' command
	 * @param handler handler
	 */
	stdEntitlementRead(handler: StdEntitlementReadHandler): this {
		return this.command(StandardCommand.StdEntitlementRead, handler)
	}

	/**
	 * Add a handler for 'std:test-connection' command
	 * @param handler handler
	 */
	stdTestConnection(handler: StdTestConnectionHandler): this {
		return this.command(StandardCommand.StdTestConnection, handler)
	}

	/**
	 * Add a handler for 'std:change-password' command
	 * @param handler handler
	 */
	stdChangePassword(handler: StdChangePasswordHandler): this {
		return this.command(StandardCommand.StdChangePassword, handler)
	}
	

	/**
	 * Add a handler for a command of specified type
	 * @param type command type
	 * @param handler handler
	 */
	command(type: string, handler: CommandHandler): this {
		this._handlers.set(type, handler)
		return this
	}

	/**
	 * Execute the handler for given command type
	 *
	 * Note: This function MUST NOT be called by the connector directly
	 *
	 * @param type command type
	 * @param context connector context
	 * @param input command input
	 * @param res writable
	 */
	async _exec(type: string, context: Context, input: any, res: Writable, customizer?: ConnectorCustomizer): Promise<void> {
		
		const handler: CommandHandler | undefined = this._handlers.get(type)
		if (!handler) {
			throw new Error(`unsupported command: ${type}`)
		}

		await contextState.run(context, async () => {
			// If customizer does not exist, we just run the command handler itself.
			if (!customizer) {
				return handler(context, input, new ResponseStream<any>(res))
			}

			// If before handler exists, run the before handler and updates the command input
			let beforeHandler: ConnectorCustomizerHandler | undefined = customizer.handlers.get(customizer.handlerKey(CustomizerType.Before, type))
			if (beforeHandler) {
				input = await beforeHandler(context, input)
			}

			// If after handler does not exist, run the command handler with updated input
			let afterHandler: ConnectorCustomizerHandler | undefined = customizer.handlers.get(customizer.handlerKey(CustomizerType.After, type))
			if (!afterHandler) {
				return handler(context, input, new ResponseStream<any>(res))
			}

			// If after handler exists, run the after handler with an interceptor. Because we pass in writable to the command handlder,
			// we need an interceptor to capture the result from the command handler, run that though the after handler and then write
			// the final result to the original writable stream
			let resInterceptor = new Transform({
				writableObjectMode: true,
				async transform(rawResponse: RawResponse, encoding: BufferEncoding, callback: TransformCallback) {
					if (rawResponse.type == ResponseType.Output) {
						rawResponse.data = await afterHandler!(context, rawResponse.data)
					}

					res.write(rawResponse)
					callback()
				},
			})

			// We need to wait on the interceptor to be done writting and flushing before we resolve the promise. If we don't wait,
			// the interceptor could be ended but is still flushing while this _exec method is resolved. That would cause the writable
			// stream that get passed into this _exec method to end as well, and then receive another write call, causing that stream to fail.
			return new Promise<void>(async (resolve, reject) => {
				resInterceptor.on('finish', function(){
					resolve()
				})

				resInterceptor.on('error', function (e) {
					reject(e)
				})

				await handler(context, input, new ResponseStream<any>(resInterceptor))
				resInterceptor.end()
			})
		})

	}
}

/**
 * Creates a connector instance with default options
 */
export const createConnector = (): Connector => {
	return new Connector()
}