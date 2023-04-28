/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema, Attributes, ObjectOutput } from './command'

/**
 * Input object of `std:account:create` command
 */
export type StdAccountCreateInput = {
	identity?: string
	attributes: any
	schema?: AccountSchema
}

/**
 * Output object of `std:account:create` command
 */
export type StdAccountCreateOutput = ObjectOutput & {
	disabled?: boolean
	locked?: boolean
	attributes: Attributes
}
