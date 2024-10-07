/* Copyright (c) 2024. SailPoint Technologies, Inc. All rights reserved. */

import { Context, logger, readConfig, Response, StdAccountListInput, StdAccountListOutput } from ".";
import { Partition } from "./partition";

export interface PartitionAdapter {
	getPartitions(context: Context, input: StdAccountListInput): Promise<Array<Partition>>
	list(context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>, partition?: Partition): Promise<void>
}

export class PartitionHandler {
	public partitionAdapter;
	public childLogger = logger.child(
		{ Component: 'Partition Handler', timestamp: `${new Date(Date.now()).toISOString()}` }
	)

	constructor(partitionAdapter: PartitionAdapter) {
		this.partitionAdapter = partitionAdapter;
	}

	/**
 	 * Handles partitioning operation for the connector which supports the partitioning.
	 * 
	 * @param context Context
	 * @param input StdAccountListInput
	 * @param res Response<StdAccountListOutput>
 	 */
	async handler(context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>): Promise<void> {
		const config = await readConfig();
		const isPatitionEnabled = config.partitionAggregationEnabled;
		this.childLogger.info(`Partition aggregation enabled -  ${isPatitionEnabled}`)

		var partitionList: Array<Partition> | undefined;

		// Get the partitions from the connector if partitining is enabled
		if (isPatitionEnabled) {
			let startTime = new Date().getTime();
			partitionList = await this.partitionAdapter.getPartitions(context, input);
			let endTime = new Date().getTime();
			this.childLogger.info(`Time taken to return partitions - ${endTime - startTime} milliseconds`)
		}

		if (partitionList != undefined && partitionList.length > 0) {
			let partitionCount = partitionList.length;
			this.childLogger.info(`Number of partitons returned - ${partitionCount}`)
			let promises = [];
			let partitionsDone = 0
			for (const partition of partitionList!) {
				promises.push((async() => {
					let startTime = new Date().getTime();
    				await this.partitionAdapter.list(context, input, res, partition);
					let endTime = new Date().getTime();
    				partitionsDone += 1
    				this.childLogger.info(`Partition ${partitionsDone} of ${partitionCount} done after ${endTime - startTime} milliseconds`)
				})());
			}
			await Promise.all(promises)
		} else {
			return await this.partitionAdapter.list(context, input, res, undefined);
		}
	}
}
