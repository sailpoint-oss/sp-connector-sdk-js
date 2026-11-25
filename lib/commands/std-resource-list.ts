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
 * Applies only when no `datasetId` is provided; input with a `datasetId` is handled as a single dataset.
 *
 * Each call receives only the `schemas` whose `configuration.datasetId` matches its dataset (schemas without a
 * `configuration.datasetId` are forwarded only when a single dataset is requested) and never a singular `schema`.
 * Entries of `datasetIds` that are not non-empty strings are skipped with a warning. The datasets share one
 * response, so this mode is stateless: handlers must not rely on `saveState` per dataset.
 */
export type StdResourceListDatasetsInput = {
	datasetIds: string[]
	schemas?: Schema[]
}

/**
 * Output object of `std:resource:list` command
 */
export type StdResourceListOutput = ResourceOutput
