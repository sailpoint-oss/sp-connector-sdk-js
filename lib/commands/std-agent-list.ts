/* Copyright (c) 2025. SailPoint Technologies, Inc. All rights reserved. */

/**
 * Input object of `std:agent:list` command
 */
export type StdAgentListInput = {
	datasetId: string
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
 */
export type StdAgentListDatasetsInput = {
	datasetIds: string[]
}

/**
 * Output object of `std:agent:list` command
 */
export type StdAgentListDatasetsOutput = {
	datasetId: string
	identity: string
	attributes: Record<string,any>
}
