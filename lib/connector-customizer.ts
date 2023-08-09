/* Copyright (c) 2023. SailPoint Technologies, Inc. All rights reserved. */

import { Context } from './connector-handler'
import { StandardCommand } from './commands'
import { contextState } from './async-context'
import { 
	ConnectorCustomizerHandler,
	StdTestConnectionAfterHandler,
	StdTestConnectionBeforeHandler,
	StdAccountCreateAfterHandler,
	StdAccountCreateBeforeHandler,
	StdAccountReadAfterHandler,
	StdAccountReadBeforeHandler,
	StdAccountUpdateAfterHandler,
	StdAccountUpdateBeforeHandler,
	StdAccountDeleteAfterHandler,
	StdAccountDeleteBeforeHandler,
	StdAccountEnableAfterHandler,
	StdAccountEnableBeforeHandler,
	StdAccountDisableAfterHandler,
	StdAccountDisableBeforeHandler,
	StdAccountUnlockAfterHandler,
	StdAccountUnlockBeforeHandler,
	StdAccountListBeforeHandler,
	StdEntitlementReadAfterHandler,
	StdEntitlementReadBeforeHandler,
	StdEntitlementListBeforeHandler,
	StdChangePasswordAfterHandler,
	StdChangePasswordBeforeHandler
} from './connector-customizer-handler'

/**
 * Connector to build by attaching handlers for supported commands.
 */
export class ConnectorCustomizer {
	private readonly _handlers: Map<string, ConnectorCustomizerHandler>

	constructor() {
		this._handlers = new Map<string, ConnectorCustomizerHandler>()
	}

	get handlers(): Map<string, ConnectorCustomizerHandler> {
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

	beforeStdAccountCreate(handler: StdAccountCreateBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountCreate, HandlerType.Before), handler)
		return this
	}

	afterStdAccountCreate(handler: StdAccountCreateAfterHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountCreate, HandlerType.After), handler)
		return this
	}

	beforeStdAccountRead(handler: StdAccountReadBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountRead, HandlerType.Before), handler)
		return this
	}

	afterStdAccountRead(handler: StdAccountReadAfterHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountRead, HandlerType.After), handler)
		return this
	}

	beforeStdAccountUpdate(handler: StdAccountUpdateBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountUpdate, HandlerType.Before), handler)
		return this
	}

	afterStdAccountUpdate(handler: StdAccountUpdateAfterHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountUpdate, HandlerType.After), handler)
		return this
	}

	beforeStdAccountDelete(handler: StdAccountDeleteBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountDelete, HandlerType.Before), handler)
		return this
	}

	afterStdAccountDelete(handler: StdAccountDeleteAfterHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountDelete, HandlerType.After), handler)
		return this
	}

	beforeStdAccountEnable(handler: StdAccountEnableBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountEnable, HandlerType.Before), handler)
		return this
	}

	afterStdAccountEnable(handler: StdAccountEnableAfterHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountEnable, HandlerType.After), handler)
		return this
	}

	beforeStdAccountDisable(handler: StdAccountDisableBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountDisable, HandlerType.Before), handler)
		return this
	}

	afterStdAccountDisable(handler: StdAccountDisableAfterHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountDisable, HandlerType.After), handler)
		return this
	}

	beforeStdAccountUnlock(handler: StdAccountUnlockBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountUnlock, HandlerType.Before), handler)
		return this
	}

	afterStdAccountUnlock(handler: StdAccountUnlockAfterHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountUnlock, HandlerType.After), handler)
		return this
	}

	beforeStdAccountList(handler: StdAccountListBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdAccountList, HandlerType.Before), handler)
		return this
	}

	beforeStdEntitlementRead(handler: StdEntitlementReadBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdEntitlementRead, HandlerType.Before), handler)
		return this
	}

	afterStdEntitlementRead(handler: StdEntitlementReadAfterHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdEntitlementRead, HandlerType.After), handler)
		return this
	}

	beforeStdEntitlementList(handler: StdEntitlementListBeforeHandler): this {
		this._handlers.set(this.handlerKey(StandardCommand.StdEntitlementList, HandlerType.Before), handler)
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

	handlerKey(cmdType: string, handlerType: HandlerType): string {
		return `${handlerType}:${cmdType}`
	}

	async _exec(cmdType: string, handlerType: HandlerType, context: Context, input: any): Promise<any> {
		const handler: ConnectorCustomizerHandler | undefined = this._handlers.get(this.handlerKey(cmdType, handlerType))
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

