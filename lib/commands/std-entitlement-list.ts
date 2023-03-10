/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Attributes, ObjectOutput } from './command'

/**
 * Input object of `std:entitlement:list` command
 */
export type StdEntitlementListInput = {
	type: string
}

/**
 * Output object of `std:entitlement:list` command
 */
export type StdEntitlementListOutput = ObjectOutput & {
	type: string
	deleted?: boolean
	attributes: Attributes
}
