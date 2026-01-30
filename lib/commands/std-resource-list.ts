/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { DatasetSchema } from './command'

/**
 * Input object of `std:resource:list` command
 */
export type StdResourceListInput = {
	datasetId: string
	datasetSchema?: DatasetSchema
}

/**
 * Output object of `std:resource:list` command
 */
export type StdResourceListOutput = {
	identity: string
	attributes: Record<string, any>
}

/**
 * Input object of `std:resource:list` command
 * Schemas is a record mapping datasetId to datasetSchema
 */
export type StdResourceListDatasetsInput = {
	datasetIds: string[]
	datasetSchemas?: Record<string, DatasetSchema>
}

/**
 * Output object of `std:resource:list` command
 */
export type StdResourceListDatasetsOutput = {
	datasetId: string
	identity: string
	attributes: Record<string,any>
}
