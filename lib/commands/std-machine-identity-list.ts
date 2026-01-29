/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { DatasetSchema } from './command'

/**
 * Input object of `std:machine-identity:list` command
 */
export type StdMachineIdentityListInput = {
	datasetId: string
	datasetSchema?: DatasetSchema
}

/**
 * Output object of `std:machine-identity:list` command
 */
export type StdMachineIdentityListOutput = {
	identity: string
	attributes: Record<string, any>
}

/**
 * Input object of `std:machine-identity:list` command
 * Schemas is a record mapping datasetId to datasetSchema
 */
export type StdMachineIdentityListDatasetsInput = {
	datasetIds: string[]
	datasetSchemas?: Record<string, DatasetSchema>
}

/**
 * Output object of `std:machine-identity:list` command
 */
export type StdMachineIdentityListDatasetsOutput = {
	datasetId: string
	identity: string
	attributes: Record<string,any>
}
