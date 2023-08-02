/* Copyright (c) 2023. SailPoint Technologies, Inc. All rights reserved. */

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
} from './handler'
import { StdSpecReadDefaultHandler } from './connector-spec'
import { StandardCommand } from './commands'
import { ResponseStream } from './response'
import { Writable } from 'stream'
import { contextState } from './async-context'
import { PrePostHandler, StdChangePasswordPostHandler, StdChangePasswordPreHandler, StdTestConnectionPostHandler, StdTestConnectionPreHandler } from './pre-post-handlers'

/**
 * Connector to build by attaching handlers for supported commands.
 */
export class ConnectorPrePostHandler {
	private readonly _handlers: Map<string, PrePostHandler>

	constructor() {
		this._handlers = new Map<string, PrePostHandler>()
	}

	/**
	 * Get the map of command handlers
	 */
	get handlers(): Map<string, PrePostHandler> {
		return this._handlers
	}


	/**
	 * Add a handler for 'std:test-connection' command
	 * @param handler handler
	 */
	stdTestConnectionPreHanlder(handler: StdTestConnectionPreHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdTestConnection, HandlerType.Pre), handler)
		return this
	}

	stdTestConnectionPostHanlder(handler: StdTestConnectionPostHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdTestConnection, HandlerType.Post), handler)
		return this
	}

	/**
	 * Add a handler for 'std:change-password' command
	 * @param handler handler
	 */
	stdChangePasswordPreHandler(handler: StdChangePasswordPreHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdChangePassword, HandlerType.Pre), handler)
		return this
	}

	stdChangePasswordPostHandler(handler: StdChangePasswordPostHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdChangePassword, HandlerType.Post), handler)
		return this
	}

	private handlerKey(cmdType: string, handlerType: HandlerType): string {
		return `${cmdType}:${handlerType}`
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
	async _exec(cmdType: string, handlerType: HandlerType, context: Context, input: any): Promise<any> {
		const handler: PrePostHandler | undefined = this._handlers.get(this.handlerKey(cmdType, handlerType))
		if (!handler) {
			return input
		}

		return await contextState.run(context, () => handler(context, input))
	}
}

/**
 * Creates a connector instance with default options
 */
export const createConnectorPrePostHandler = (): ConnectorPrePostHandler => {
	return new ConnectorPrePostHandler()
}


export enum HandlerType {
	Pre = "pre",
	Post = "post"
}

