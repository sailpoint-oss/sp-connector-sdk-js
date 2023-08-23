/* Copyright (c) 2023. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectOutput } from './command'

/**
 * Input object of `std:source-data:list` command
 */
export type StdSourceDataListInput = {
	sourceDataKey: string
	queryInput?: QueryInput
}

type QueryInput = {
	query?: string
	excludeItems?: [string]
	limit?: number
}

/**
 * Output object of `std:source-data:list` command
 */
export type StdSourceDataListOutput = ObjectOutput &
	[
		{
			key: string
			label: string
			subLabel?: string
		}
	]
