/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Attributes, ObjectInput, ObjectOutput } from './command'

/**
 * Input object of `std:entitlement:read` command
 */
export type StdEntitlementReadInput = ObjectInput & {
	type: string
}

/**
 * Output object of `std:entitlement:read` command
 */
export type StdEntitlementReadOutput = ObjectOutput & {
	type: string
	attributes: Attributes
}
