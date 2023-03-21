/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Attributes, CommandState, ObjectOutput } from './command'

/**
 * Input object of `std:entitlement:list` command
 */
export type StdEntitlementListInput = {
	type: string
	stateful?: boolean
	state?: CommandState
}

/**
 * Output object of `std:entitlement:list` command
 */
export type StdEntitlementListOutput = ObjectOutput & {
	type: string
	deleted?: boolean
	attributes: Attributes
}
