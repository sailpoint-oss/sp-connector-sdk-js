/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema, Attributes, CommandState, ObjectOutput } from './command'

/**
 * Input object of `std:account:list` command
 */
export type StdAccountListInput = {
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
	attributes: Attributes
}
