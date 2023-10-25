/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema, Attributes, ObjectInput, ObjectOutput, Permission } from './command'

/**
 * Input object of `std:account:read` command
 */
export type StdAccountReadInput = ObjectInput & {
	schema?: AccountSchema
}

/**
 * Output object of `std:account:read` command
 */
export type StdAccountReadOutput = ObjectOutput & {
	disabled?: boolean
	locked?: boolean
	attributes: Attributes
	permissions?: Permission[]
}
