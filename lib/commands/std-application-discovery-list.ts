/* Copyright (c) 2024. SailPoint Technologies, Inc. All rights reserved. */

/**
 * Input object of `std:application-discovery:list` command
 */
export type StdApplicationDiscoveryInputList = {}

/**
 * Output object of `std:application-discovery:list` command
 */
export type StdApplicationDiscoveryOutputList = {
	discoveredApplication: DiscoveredApplication
}

/**
 * DiscoveredApplication object for `std:application-discovery:list` command output
 */
export type DiscoveredApplication = {
	id: string,
	primaryAppName: string,
	secondaryAppName: string
	description: string,
	status: string,
	extraProperties: Map<string, object>
}
