/* Copyright (c) 2024. SailPoint Technologies, Inc. All rights reserved. */

/**
 * Input object of `std:application-discovery:list` command
 */
export type StdApplicationDiscoveryInput = {}

/**
 * Output object of `std:application-discovery:list` command
 */
export type StdApplicationDiscoveryOutput = {
	discoveredApplication: DiscoveredApplication
}

/**
 * DiscoveredApplication object for `std:application-discovery:list` command output
 */
export type DiscoveredApplication = {
	id: string,
	name: string,
	description: string,
	status: string
}
