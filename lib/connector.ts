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
} from './handler'
import { StdSpecReadDefaultHandler } from './connector-spec'
import { StandardCommand } from './commands'
import { ResponseStream } from './response'
import { Writable } from 'stream'
import { contextState } from './async-context';

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
	async _exec(type: string, context: Context, input: any, res: Writable): Promise<void> {
		
		const handler: CommandHandler | undefined = this._handlers.get(type)
		if (!handler) {
			throw new Error(`unsupported command: ${type}`)
		}

		let rules = require("/connectorRules").connectorRules

		await contextState.run(context, () => {
			 return handler(context, input, new ResponseStream<any>(res))
		});

	}
}

/**
 * Creates a connector instance with default options
 */
export const createConnector = (): Connector => {
	return new Connector()
}

export class ConnectorHanlders {
	async _exec(input: string): Promise<void> {
		console.log('The input is: ' + input)
	}
}

export const createConnectorHandlers = (): Connector => {
	return new Connector()
}