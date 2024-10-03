import { Context, readConfig, Response, StdAccountListInput, StdAccountListOutput } from ".";
import { Partition } from "./partition";

export interface PartitionedAdapter {
	getPartitions(context: Context, input: StdAccountListInput): Promise<Array<Partition>>
	list(context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>, partition?: Partition): Promise<void>
}

export class Partitioned {
	public h;

	constructor(h: PartitionedAdapter) {
		this.h = h;
	}

	async handler(context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>): Promise<void> {

		const config = await readConfig();
		const isPatitionEnabled = config.partitionAggregationEnabled;
		var partitionList: Array<Partition> | undefined;

		if (isPatitionEnabled) {
			partitionList = await this.h.getPartitions(context, input);
		}

		if (!partitionList) {
			let promises = [];
			for (const partition of partitionList!) {
				promises.push(this.h.list(context, input, res, partition));
			}
			await Promise.all(promises);
		} else {
			return await this.h.list(context, input, res, undefined);
		}
	}
}
