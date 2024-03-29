/* Copyright (c) 2023. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectOutput } from './command'

/**
 * Input object of `std:source-data:discover` command
 */
export type StdSourceDataDiscoverInput = {
	queryInput?: QueryInput
}

type QueryInput = {
	query?: string
	limit?: number
}

type SourceDataDiscover = {
	key: string
	label: string
	subLabel?: string
}

/**
 * Output object of `std:source-data:discover` command
 */
export type StdSourceDataDiscoverOutput = SourceDataDiscover[]
