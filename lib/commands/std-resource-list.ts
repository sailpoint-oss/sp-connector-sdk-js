/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { DatasetSchema } from './command'

/**
 * Input object of `std:resource:list` command
 */
export type StdResourceListInput = {
	datasetId: string
}

/**
 * Output object of `std:resource:list` command
 */
export type StdResourceListOutput = {
	identity: string
	attributes: Record<string, any>
}

/**
 * Output object of `std:resource:list` command
 */
export type StdResourceListDatasetOutput = {
	identity: string
	attributes: Record<string, any>
}

