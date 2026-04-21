/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema, Attributes, CommandState, ObjectOutput, Permission } from './command'

/**
 * Input object of `std:account:list` command
 */
export type StdAccountListInput = {
	datasetId?: string
	stateful?: boolean
	state?: CommandState
	schema?: AccountSchema
}

/**
 * Output object of `std:account:list` command
 */
export type StdAccountListOutput = ObjectOutput & {
	disabled?: boolean
	locked?: boolean
	deleted?: boolean
	incomplete?: boolean
	finalUpdate?: boolean
	attributes: Attributes
	permissions?: Permission[]
}

/**
 * Input object of `std:account:list` command
 */
export type StdAccountListDatasetsInput = StdAccountListInput & {
	datasetIds?: string[]
}

/**
 * Output object of `std:account:list` command
 */
export type StdAccountListDatasetsOutput = StdAccountListOutput & {
	datasetId?: string
}
