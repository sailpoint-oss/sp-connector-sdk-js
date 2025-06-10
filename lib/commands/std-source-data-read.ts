/* Copyright (c) 2023. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectOutput } from './command'

/**
 * Input object of `std:source-data:read` command
 */
export type StdSourceDataReadInput = {
	sourceDataKey: string
	queryInput?: QueryInput
}

type QueryInput = {
	query?: string
	excludeItems?: [string]
	limit?: number
}

type SourceDataRead = {
	key: string
	label: string
	subLabel?: string
}

/**
 * Output object of `std:source-data:read` command
 */
export type StdSourceDataReadOutput = SourceDataRead[]
