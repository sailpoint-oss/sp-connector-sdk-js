/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ResourceInput, ResourceOutput, Schema } from './command'

/**
 * Input object of `std:resource:list` command
 */
export type StdResourceListInput = ResourceInput & {
	schemas?: Schema[]
}

/**
 * Input object of `std:resource:list` when the platform requests multiple datasets.
 *
 * The SDK invokes the standard single-dataset handler once for each unique dataset ID.
 */
export type StdResourceListDatasetsInput = {
	datasetIds: string[]
	schemas?: Schema[]
}

/**
 * Output object of `std:resource:list` command
 */
export type StdResourceListOutput = ResourceOutput
