/* Copyright (c) 2024. SailPoint Technologies, Inc. All rights reserved. */

/**
 * Input object of `std:application-discovery:list` command
 */
export type StdApplicationDiscoveryInputList = {}

/**
 * Output object of `std:application-discovery:list` command
 */
export type StdApplicationDiscoveryOutputList = {
	id: string,
	primaryAppName: string,
	secondaryAppName?: string
	description: string,
	status?: string,
	[properties: string]: string | string[] | undefined | Record<string, string>[]
}

/**
 * Input object of `std:application-discovery:list` command for a specific dataset
 */
export type StdApplicationDiscoveryListInput = {
	datasetId: string
}

/**
 * Output object of `std:application-discovery:list` command for a specific dataset
 */
export type StdApplicationDiscoveryListOutput = {
	attributes: Record<string, any>
}

/**
 * Input object of `std:application-discovery:list` command for multiple datasets
 */
export type StdApplicationDiscoveryListDatasetsInput = {
	datasetIds: string[]
}

/**
 * Output object of `std:application-discovery:list` command for multiple datasets
 */
export type StdApplicationDiscoveryListDatasetsOutput = {
	datasetId: string
	attributes: Record<string, any>
}
