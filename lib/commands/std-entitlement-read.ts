/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Attributes, EntitlementSchema, ObjectInput, ObjectOutput, Permission } from './command'

/**
 * Input object of `std:entitlement:read` command
 */
export type StdEntitlementReadInput = ObjectInput & {
	type: string
	schema?: EntitlementSchema
}

/**
 * Output object of `std:entitlement:read` command
 */
export type StdEntitlementReadOutput = ObjectOutput & {
	type: string
	attributes: Attributes
	permissions?: Permission[]
}
