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
	StdAuthenticateAfterHandler,
	StdAuthenticateBeforeHandler,
	StdEntitlementReadAfterHandler,
	StdEntitlementReadBeforeHandler,
	StdEntitlementListBeforeHandler,
	StdEntitlementListAfterHandler,
	StdChangePasswordAfterHandler,
	StdChangePasswordBeforeHandler,
	StdSourceDataDiscoverBeforeHandler,
	StdSourceDataDiscoverAfterHandler,
	StdSourceDataReadBeforeHandler,
	StdSourceDataReadAfterHandler,
	StdConfigOptionsAfterHandler,
	StdConfigOptionsBeforeHandler,
	StdApplicationDiscoveryListBeforeHandler,
	StdApplicationDiscoveryListAfterHandler,
	StdAccountListAfterHandler,
} from './connector-customizer-handler'
import { logger } from './logger'

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
	beforeStdTestConnection(handler: any): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdTestConnection), handler)
		logger.info("Before endpoint context " + JSON.stringify(this._handlers));
		logger.info("Before endpoint context11 " + JSON.stringify(handler));
		return this
	}

	/**
	 * Add an after handler for 'std:test-connection' command
	 * @param handler handler
	 */
	afterStdTestConnection(handler: StdTestConnectionAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdTestConnection), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:create' command
	 * @param handler handler
	 */
	beforeStdAccountCreate(handler: StdAccountCreateBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdAccountCreate), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:create' command
	 * @param handler handler
	 */
	afterStdAccountCreate(handler: StdAccountCreateAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdAccountCreate), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:read' command
	 * @param handler handler
	 */
	beforeStdAccountRead(handler: StdAccountReadBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdAccountRead), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:read' command
	 * @param handler handler
	 */
	afterStdAccountRead(handler: StdAccountReadAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdAccountRead), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:update' command
	 * @param handler handler
	 */
	beforeStdAccountUpdate(handler: StdAccountUpdateBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdAccountUpdate), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:update' command
	 * @param handler handler
	 */
	afterStdAccountUpdate(handler: StdAccountUpdateAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdAccountUpdate), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:delete' command
	 * @param handler handler
	 */
	beforeStdAccountDelete(handler: StdAccountDeleteBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdAccountDelete), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:delete' command
	 * @param handler handler
	 */
	afterStdAccountDelete(handler: StdAccountDeleteAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdAccountDelete), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:enable' command
	 * @param handler handler
	 */
	beforeStdAccountEnable(handler: StdAccountEnableBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdAccountEnable), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:enable' command
	 * @param handler handler
	 */
	afterStdAccountEnable(handler: StdAccountEnableAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdAccountEnable), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:disable' command
	 * @param handler handler
	 */
	beforeStdAccountDisable(handler: StdAccountDisableBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdAccountDisable), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:account:disable' command
	 * @param handler handler
	 */
	afterStdAccountDisable(handler: StdAccountDisableAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdAccountDisable), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:unlock' command
	 * @param handler handler
	 */
	beforeStdAccountUnlock(handler: StdAccountUnlockBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdAccountUnlock), handler)
		
		return this
	}

	/**
	 * Add an after handler for 'std:account:unlock' command
	 * @param handler handler
	 */
	afterStdAccountUnlock(handler: StdAccountUnlockAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdAccountUnlock), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:account:list' command
	 * @param handler handler
	 */
	beforeStdAccountList(handler: StdAccountListBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdAccountList), handler)
		return this
	}

	/**
	 * Add a after handler for 'std:account:list' command
	 * @param handler handler
	 */
	afterStdAccountList(handler: StdAccountListAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdAccountList), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:authenticate' command
	 * @param handler handler
	 */
	beforeStdAuthenticate(handler: StdAuthenticateBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdAuthenticate), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:authenticate' command
	 * @param handler handler
	 */
	afterStdAuthenticate(handler: StdAuthenticateAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdAuthenticate), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:config-options:read' command
	 * @param handler handler
	 */
	beforeStdConfigOptions(handler: StdConfigOptionsBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdConfigOptions), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:config-options:read' command
	 * @param handler handler
	 */
	afterStdConfigOptions(handler: StdConfigOptionsAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdConfigOptions), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:application-discovery:list' command
	 * @param handler handler
	 */
	beforeStdApplicationDiscoveryList(handler: StdApplicationDiscoveryListBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdApplicationDiscoveryList), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:application-discovery:list' command
	 * @param handler handler
	 */
	afterStdApplicationDiscoveryList(handler: StdApplicationDiscoveryListAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdApplicationDiscoveryList), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:entitlement:read' command
	 * @param handler handler
	 */
	beforeStdEntitlementRead(handler: StdEntitlementReadBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdEntitlementRead), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:entitlement:read' command
	 * @param handler handler
	 */
	afterStdEntitlementRead(handler: StdEntitlementReadAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdEntitlementRead), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:entitlement:list' command
	 * @param handler handler
	 */
	beforeStdEntitlementList(handler: StdEntitlementListBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdEntitlementList), handler)
		return this
	}

	/**
	 * Add a after handler for 'std:entitlement:list' command
	 * @param handler handler
	 */
	afterStdEntitlementList(handler: StdEntitlementListAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdEntitlementList), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:change-password' command
	 * @param handler handler
	 */
	beforeStdChangePassword(handler: StdChangePasswordBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdChangePassword), handler)
		return this
	}

	/**
	 * Add an after handler for 'std:change-password' command
	 * @param handler handler
	 */
	afterStdChangePassword(handler: StdChangePasswordAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdChangePassword), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:source-data:discover' command
	 * @param handler handler
	 */
	beforeStdSourceDataDiscover(handler: StdSourceDataDiscoverBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdSourceDataDiscover), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:source-data:discover' command
	 * @param handler handler
	 */
	afterStdSourceDataDiscover(handler: StdSourceDataDiscoverAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdSourceDataDiscover), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:source-data:read' command
	 * @param handler handler
	 */
	beforeStdSourceDataRead(handler: StdSourceDataReadBeforeHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.Before, StandardCommand.StdSourceDataRead), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:source-data:read' command
	 * @param handler handler
	 */
	afterStdSourceDataRead(handler: StdSourceDataReadAfterHandler): this {
		this._handlers.set(this.handlerKey(CustomizerType.After, StandardCommand.StdSourceDataRead), handler)
		return this
	}

	/**
	 * Add a before handler for 'std:source-data:read' command
	 * @param handler handler
	 */
	beforeEndpoint(handler: any, endpointPointName: string): this {
		this._handlers.set(endpointPointName, handler)
		handler.context = handler
		logger.info("Before endpoint context " + JSON.stringify(handler.context));
		return this
		// //return this._execEndpoint(handler, context, input)
		// return await contextState.run(context, () => handler)
	}

	/**
	 * Add a before handler for 'std:source-data:read' command
	 * @param handler handler
	 */
	async afterEndpoint(handler: any, endpointPointName: string): Promise<any> {
		this._handlers.set(endpointPointName, handler)
		return this
		//return await contextState.run(context, () => handler(context, input))
	}

	/**
	 * Generate handler key base on customizer type and command type
	 *
	 * @param customizerType customizer type
	 * @param cmdType command type
	 */
	handlerKey(customizerType: CustomizerType, cmdType: string): string {
		return `${customizerType}:${cmdType}`
	}

	/**
	 * Execute the handler for given type.
	 * Type is a comibination of command type and customizer type, for example, before:std:account:read
	 *
	 * @param type handler type
	 * @param context connector context
	 * @param input input to the handler function
	 */
	async _exec(type: string, context: Context, input: any): Promise<any> {
		const handler: ConnectorCustomizerHandler | undefined = this._handlers.get(type)
		if (!handler) {
			throw new Error(`No handler found for type: ${type}`)
		}

		return await contextState.run(context, () => handler(context, input))
	}

	async _execEndpoint(context: Context, input: any, endpointPointName:string): Promise<any> {
		const handler = this._handlers.get(endpointPointName)
		logger.info("Handler " + JSON.stringify(this._handlers));
		if (!handler) {
			throw new Error(`No handler found for type: ${endpointPointName}`)
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
export enum CustomizerType {
	Before = 'before',
	After = 'after',
}
