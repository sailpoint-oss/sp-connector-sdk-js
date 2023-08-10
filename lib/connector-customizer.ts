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
 * Connector customizer to build by attaching handlers for supported commands.
 */
export class ConnectorCustomizer {
	private readonly _handlers: Map<string, ConnectorCustomizerHandler>

	constructor() {
		this._handlers = new Map<string, ConnectorCustomizerHandler>()
	}

	/**
	 * Get the map of command handlers
	 */
	get handlers(): Map<string, ConnectorCustomizerHandler> {
		return this._handlers
	}

	/**
	 * Add a before handler for 'std:test-connection' command
	 * @param handler handler
	 */
	beforeStdTestConnection(handler: StdTestConnectionBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdTestConnection), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:test-connection' command
	 * @param handler handler
	 */
	afterStdTestConnection(handler: StdTestConnectionAfterHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.After, StandardCommand.StdTestConnection), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:create' command
	 * @param handler handler
	 */
	beforeStdAccountCreate(handler: StdAccountCreateBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdAccountCreate), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:create' command
	 * @param handler handler
	 */
	afterStdAccountCreate(handler: StdAccountCreateAfterHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.After, StandardCommand.StdAccountCreate), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:read' command
	 * @param handler handler
	 */
	beforeStdAccountRead(handler: StdAccountReadBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdAccountRead), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:read' command
	 * @param handler handler
	 */
	afterStdAccountRead(handler: StdAccountReadAfterHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.After, StandardCommand.StdAccountRead), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:update' command
	 * @param handler handler
	 */
	beforeStdAccountUpdate(handler: StdAccountUpdateBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdAccountUpdate), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:update' command
	 * @param handler handler
	 */
	afterStdAccountUpdate(handler: StdAccountUpdateAfterHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.After, StandardCommand.StdAccountUpdate), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:delete' command
	 * @param handler handler
	 */
	beforeStdAccountDelete(handler: StdAccountDeleteBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdAccountDelete), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:delete' command
	 * @param handler handler
	 */
	afterStdAccountDelete(handler: StdAccountDeleteAfterHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.After, StandardCommand.StdAccountDelete), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:enable' command
	 * @param handler handler
	 */
	beforeStdAccountEnable(handler: StdAccountEnableBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdAccountEnable), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:enable' command
	 * @param handler handler
	 */
	afterStdAccountEnable(handler: StdAccountEnableAfterHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.After, StandardCommand.StdAccountEnable), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:disable' command
	 * @param handler handler
	 */
	beforeStdAccountDisable(handler: StdAccountDisableBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdAccountDisable), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:disable' command
	 * @param handler handler
	 */
	afterStdAccountDisable(handler: StdAccountDisableAfterHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.After, StandardCommand.StdAccountDisable), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:unlock' command
	 * @param handler handler
	 */
	beforeStdAccountUnlock(handler: StdAccountUnlockBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdAccountUnlock), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:unlock' command
	 * @param handler handler
	 */
	afterStdAccountUnlock(handler: StdAccountUnlockAfterHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.After, StandardCommand.StdAccountUnlock), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:list' command
	 * @param handler handler
	 */
	beforeStdAccountList(handler: StdAccountListBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdAccountList), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:entitlement:read' command
	 * @param handler handler
	 */
	beforeStdEntitlementRead(handler: StdEntitlementReadBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdEntitlementRead), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:entitlement:read' command
	 * @param handler handler
	 */
	afterStdEntitlementRead(handler: StdEntitlementReadAfterHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.After, StandardCommand.StdEntitlementRead), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:entitlement:list' command
	 * @param handler handler
	 */
	beforeStdEntitlementList(handler: StdEntitlementListBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdEntitlementList), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:change-password' command
	 * @param handler handler
	 */
	beforeStdChangePassword(handler: StdChangePasswordBeforeHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.Before, StandardCommand.StdChangePassword), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:change-password' command
	 * @param handler handler
	 */
	afterStdChangePassword(handler: StdChangePasswordAfterHandler): this {
		this._handlers.set(this.handlerKey(HandlerType.After, StandardCommand.StdChangePassword), handler)
		return this
	}

	/**
	 * Generate handler key base on handler type and command type
	 * 
	 * @param handlerType handler type
	 * @param cmdType command type
	 */
	handlerKey(handlerType: HandlerType, cmdType: string): string {
		return `${handlerType}:${cmdType}`
	}

	/**
	 * Execute the handler for given handler and command type
	 *
	 * @param cmdType command type
	 * @param handlerType handler type
	 * @param context connector context
	 * @param input input to the handler function
	 */
	async _exec(cmdType: string, handlerType: HandlerType, context: Context, input: any): Promise<any> {
		const handler: ConnectorCustomizerHandler | undefined = this._handlers.get(this.handlerKey(handlerType, cmdType))
		if (!handler) {
			throw new Error(`No ${handlerType} handler found for command: ${cmdType}`)
		}

		return await contextState.run(context, () => handler(context, input))
	}
}

/**
 * Creates a connector customizer instance with default options
 */
export const createConnectorCustomizer = (): ConnectorCustomizer => {
	return new ConnectorCustomizer()
}

/**
 * Type of handlers for the connector customizer
 */
export enum HandlerType {
	Before = "before",
	After = "after"
}

