/* Copyright (c) 2025. SailPoint Technologies, Inc. All rights reserved. */

import { DatasetSchema } from './command'

/**
 * Input object of `std:agent:list` command
 */
export type StdAgentListInput = {
	datasetId: string
	schema?: DatasetSchema
}

/**
 * Output object of `std:agent:list` command
 */
export type StdAgentListOutput = {
	identity: string
	attributes: Record<string,any>
}

/**
 * Input object of `std:agent:list` command
 * Schemas is a record mapping datasetId to datasetSchema
 */
export type StdAgentListDatasetsInput = {
	datasetIds: string[]
	datasetSchemas?: Record<string, DatasetSchema>
}

/**
 * Output object of `std:agent:list` command
 */
export type StdAgentListDatasetsOutput = {
	datasetId: string
	identity: string
	attributes: Record<string,any>
}
