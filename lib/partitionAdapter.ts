/* Copyright (c) 2024. SailPoint Technologies, Inc. All rights reserved. */

import { Context, readConfig, Response, StdAccountListInput, StdAccountListOutput } from ".";
import { Partition } from "./partition";

export interface PartitionAdapter {
	getPartitions(context: Context, input: StdAccountListInput): Promise<Array<Partition>>
	list(context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>, partition?: Partition): Promise<void>
}

export class PartitionHandler {
	public partitionAdapter;

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
		var partitionList: Array<Partition> | undefined;

		// Get the partitions from the connector if partitining is enabled
		if (isPatitionEnabled) {
			partitionList = await this.partitionAdapter.getPartitions(context, input);
		}

		if (!partitionList) {
			let promises = [];
			for (const partition of partitionList!) {
				promises.push(this.partitionAdapter.list(context, input, res, partition));
			}
			await Promise.all(promises);
		} else {
			return await this.partitionAdapter.list(context, input, res, undefined);
		}
	}
}
