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
	connectorCategory?: string
	licenseCount?: number
	isSanctioned?: boolean
	logo?: string
	appUrl?: string
	groups?: Record<string, any>[]
	createdAt?: string
	updatedAt?: string
	usersCount?: string
	applicationOwner?: string[]
	itApplicationOwner?: string[]
	businessCriticality?: string
	dataClassification?: string
	businessUnit?: string
	installType?: string
	environment?: string
	riskScore?: string
	isPrivileged?: boolean
	warrantyExpiration?: string
	attributes?: Record<string, any>
	operationalStatus?: string
	[properties: string]: string | string[] | undefined | Record<string, string>[] | number | boolean | Record<string, any>

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
	id: string
	primaryAppName: string
	description: string
	secondaryAppName?: string
	connectorCategory?: string;
	status?: string
	licenseCount?: number
	isSanctioned?: boolean
	logo?: string
	appUrl?: string
	groups?: Record<string, any>[]
	createdAt?: string
	updatedAt?: string
	usersCount?: string
	applicationOwner?: string[]
	itApplicationOwner?: string[]
	businessCriticality?: string
	dataClassification?: string
	businessUnit?: string
	installType?: string
	environment?: string
	riskScore?: string
	isPrivileged?: boolean
	warrantyExpiration?: string
	attributes?: Record<string, any>
	operationalStatus?: string
}

/**
 * Input object of `std:application-discovery:list` command for multiple datasets
 */
export type StdApplicationDiscoveryListDatasetsInput = {
	datasetIds: string[]
}

export type StdApplicationDiscoveryListDatasetsOutput = StdApplicationDiscoveryListOutput & {
	datasetId: string
}
