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
	StdAgentListHandler,
	StdAuthenticateHandler,
	StdEntitlementListHandler,
	StdEntitlementReadHandler,
	StdTestConnectionHandler,
	StdChangePasswordHandler,
	StdSourceDataDiscoverHandler,
	StdSourceDataReadHandler,
	StdConfigOptionsHandler,
	StdApplicationDiscoveryListHandler,
	StdApplicationDiscoveryDatasetListHandler,
	StdSsfStreamCreateHandler,
	StdSsfStreamDiscoverHandler,
	StdSsfStreamReadHandler,
	StdSsfStreamUpdateHandler,
	StdSsfStreamStatusUpdateHandler,
	StdSsfStreamDeleteHandler,
	StdSsfStreamVerifyHandler,
	StdSsfStreamReplaceHandler
} from './connector-handler'
import { StdSpecReadDefaultHandler } from './connector-spec'
import {
	StandardCommand,
	StdAgentListDatasetsInput,
	StdAgentListDatasetsOutput,
	StdAgentListInput,
	StdAgentListOutput,
	StdApplicationDiscoveryListDatasetsInput,
	StdApplicationDiscoveryListDatasetsOutput,
	StdApplicationDiscoveryListOutput,
} from './commands'
import { RawResponse, ResponseStream, ResponseType, Response, ResponseStreamTransform } from './response'
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
	 * Add a handler for 'std:authenticate' command
	 * @param handler handler
	 */
	stdAuthenticate(handler: StdAuthenticateHandler): this {
		return this.command(StandardCommand.StdAuthenticate, handler)
	}

	/**
	 * Add a handler for 'std:config-options:read' command
	 * @param handler handler
	 */
	stdConfigOptions(handler: StdConfigOptionsHandler): this {
		return this.command(StandardCommand.StdConfigOptions, handler)
	}

	/**
	 * Add a handler for 'std:application-discovery:list' command
	 * @param handler handler
	 */
	stdApplicationDiscoveryList(handler: StdApplicationDiscoveryListHandler): this {
		return this.command(StandardCommand.StdApplicationDiscoveryList, handler)
	}

	/**
	 * Add a handler for 'std:application-discovery:list' command with dataset context
	 * @param handler Standard handler for dataset-aware discovery list
	 * If datasetIds are provided in the input, the datasetHandler will be called for each datasetId
	 * If datasetIds are not provided, the standard handler will be called
	 */
	stdApplicationDiscoveryListWithDataset(handler: StdApplicationDiscoveryDatasetListHandler): this {
		return this.command(
			StandardCommand.StdApplicationDiscoveryList,
			async (
				context: Context,
				input: StdApplicationDiscoveryListDatasetsInput | any,
				res: Response<StdApplicationDiscoveryListDatasetsOutput>,
			): Promise<void> => {
				// Fallback (to be deprecated after migration)
				if (!input || !Array.isArray(input.datasetIds) || input.datasetIds.length === 0) {
					console.log("Inside stdApplicationDiscoveryListWithDataset handling without dataset context - fallback mode: " + JSON.stringify(input));
					await handler(context, input, res);
					return
				}
				// Dataset-aware handling
				for (const datasetId of input.datasetIds) {
					const datasetRes = new ResponseStreamTransform<StdApplicationDiscoveryListOutput, StdApplicationDiscoveryListDatasetsOutput>(res, (v: StdApplicationDiscoveryListOutput): StdApplicationDiscoveryListDatasetsOutput => {
						return {
							...v,
							datasetId,
						}
					})
					await handler(context, { datasetId }, datasetRes)
				}
			})
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
	 * Add a handler for 'std:source-data:discover' command
	 * @param handler handler
	 */
	stdSourceDataDiscover(handler: StdSourceDataDiscoverHandler): this {
		return this.command(StandardCommand.StdSourceDataDiscover, handler)
	}

	/**
	 * Add a handler for 'std:source-data:read' command
	 * @param handler handler
	 */
	stdSourceDataRead(handler: StdSourceDataReadHandler): this {
		return this.command(StandardCommand.StdSourceDataRead, handler)
	}

	/**
	 * Add a handler for 'std:ssf-stream:discover' command
	 * @param handler handler
	 */
	stdSsfStreamDiscover(handler: StdSsfStreamDiscoverHandler): this {
		return this.command(StandardCommand.StdSsfStreamDiscover, handler)
	}

	/**
	 * Add a handler for 'std:ssf-stream:read' command
	 * @param handler handler
	 */
	stdSsfStreamRead(handler: StdSsfStreamReadHandler): this {
		return this.command(StandardCommand.StdSsfStreamRead, handler)
	}

	/**
	 * Add a handler for 'std:ssf-stream:create' command
	 * @param handler handler
	 */
	stdSsfStreamCreate(handler: StdSsfStreamCreateHandler): this {
		return this.command(StandardCommand.StdSsfStreamCreate, handler)
	}


	/**
	 * Add a handler for 'std:ssf-stream:update' command
	 * @param handler handler
	 */
	stdSsfStreamUpdate(handler: StdSsfStreamUpdateHandler): this {
		return this.command(StandardCommand.StdSsfStreamUpdate, handler)
	}

	/**
	 * Add a handler for 'std:ssf-stream:status-update' command
	 * @param handler handler
	 */
	stdSsfStreamStatusUpdate(handler: StdSsfStreamStatusUpdateHandler): this {
		return this.command(StandardCommand.StdSsfStreamStatusUpdate, handler)
	}

	/**
	 * Add a handler for 'std:ssf-stream:delete' command
	 * @param handler handler
	 */
	stdSsfStreamDelete(handler: StdSsfStreamDeleteHandler): this {
		return this.command(StandardCommand.StdSsfStreamDelete, handler)
	}

	/**
	 * Add a handler for 'std:ssf-stream:verify' command
	 * @param handler handler
	 */
	stdSsfStreamVerify(handler: StdSsfStreamVerifyHandler): this {
		return this.command(StandardCommand.StdSsfStreamVerify, handler)
	}

	/**
	 * Add a handler for 'std:ssf-stream:replace' command
	 * @param handler handler
	 */
	stdSsfStreamReplace(handler: StdSsfStreamReplaceHandler): this {
		return this.command(StandardCommand.StdSsfStreamReplace, handler)
	}

	/**
	 * Add a handler for 'std:agent:list' command
	 * @param handler handler
	 */
	stdAgentList(handler: StdAgentListHandler): this {
		return this.command(StandardCommand.StdAgentList, async (context: Context, input: StdAgentListDatasetsInput, res: Response<StdAgentListDatasetsOutput>): Promise<void> => {
			for (const datasetId of input.datasetIds) {
				const datasetRes = new ResponseStreamTransform<StdAgentListOutput,StdAgentListDatasetsOutput>(res, (v: StdAgentListOutput): StdAgentListDatasetsOutput => {
					return {
						...v,
						datasetId,
					};
				})

				const datasetSchema = input.datasetSchemas?.[datasetId];

				const handlerInput: StdAgentListInput = datasetSchema
					? { datasetId, schema: datasetSchema }
					: { datasetId };

				await handler(context, handlerInput, datasetRes);
			}
		})
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
		let totalTime: number = 0;
		let roCount: number = 0;
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
						try {
							const start = performance.now();
							rawResponse.data = await afterHandler!(context, rawResponse.data)
							const end = performance.now();
							res.write(rawResponse)

							// Accumulate the total time
							totalTime += end - start;
							roCount++;
							callback()
						} catch (e: any) {
							callback(e)
						}
					} else {
						res.write(rawResponse)
						callback()
					}
				},
			})

			// We need to wait on the interceptor to be done writting and flushing before we resolve the promise. If we don't wait,
			// the interceptor could be ended but is still flushing while this _exec method is resolved. That would cause the writable
			// stream that get passed into this _exec method to end as well, and then receive another write call, causing that stream to fail.
			let interceptorComplete = new Promise<void>((resolve, reject) => {
				resInterceptor.on('finish', function(){
					// Calculate the average time once all chunks are processed. Here roCount should never be 0
    				const averageTime = totalTime / roCount;
					console.log(`After customizer time total execution time: ${totalTime} ms`);
					console.log(`Average time per output: ${averageTime.toFixed(2)} ms`);
					resolve()
				})

				resInterceptor.on('error', function (e) {
					// Calculate the average time once all chunks are processed
    				const averageTime = roCount > 0 ? totalTime / roCount : 0;
					console.log(`After customizer time total execution time: ${totalTime} ms`);
					console.log(`Average time per output: ${averageTime.toFixed(2)} ms`);
					reject(e)
				})
			})

			await handler(context, input, new ResponseStream<any>(resInterceptor))
			resInterceptor.end()
			await interceptorComplete
		})
	}
}

/**
 * Creates a connector instance with default options
 */
export const createConnector = (): Connector => {
	return new Connector()
}
