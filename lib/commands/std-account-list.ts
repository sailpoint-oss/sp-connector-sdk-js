/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Attributes, ObjectOutput } from './command'

/**
 * Input object of `std:account:list` command
 */
export type StdAccountListInput = {
	stateful?: boolean
	state?: StdAccountListState
}

/**
 * Output object of `std:account:list` command
 */
export type StdAccountListOutput = ObjectOutput & {
	disabled?: boolean
	locked?: boolean
	attributes: Attributes
}

export type StdAccountListState = {
	[key: string]: any
}