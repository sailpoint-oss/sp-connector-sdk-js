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
import { BeforeAfterHandler as BeforeAfterHandler, StdChangePasswordAfterHandler, StdChangePasswordBeforeHandler, StdTestConnectionAfterHandler, StdTestConnectionBeforeHandler } from './before-after-handlers'

/**
 * Connector to build by attaching handlers for supported commands.
 */
export class ConnectorCustomizer {
	private readonly _handlers: Map<string, BeforeAfterHandler>

	constructor() {
		this._handlers = new Map<string, BeforeAfterHandler>()
	}

	get handlers(): Map<string, BeforeAfterHandler> {
		return this._handlers
	}

	beforeStdTestConnection(handler: StdTestConnectionBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdTestConnection, HandlerType.Before), handler)
		return this
	}

	afterStdTestConnection(handler: StdTestConnectionAfterHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdTestConnection, HandlerType.After), handler)
		return this
	}

	beforeStdChangePassword(handler: StdChangePasswordBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdChangePassword, HandlerType.Before), handler)
		return this
	}

	afterStdChangePassword(handler: StdChangePasswordAfterHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdChangePassword, HandlerType.After), handler)
		return this
	}

	private handlerKey(cmdType: string, handlerType: HandlerType): string {
		return `${handlerType}:${cmdType}`
	}

	async _exec(cmdType: string, handlerType: HandlerType, context: Context, input: any): Promise<any> {
		const handler: BeforeAfterHandler | undefined = this._handlers.get(this.handlerKey(cmdType, handlerType))
		if (!handler) {
			return input
		}

		return await contextState.run(context, () => handler(context, input))
	}
}

export const createConnectorCustomizer = (): ConnectorCustomizer => {
	return new ConnectorCustomizer()
}


export enum HandlerType {
	Before = "before",
	After = "after"
}

