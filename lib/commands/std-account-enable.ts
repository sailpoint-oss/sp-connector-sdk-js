/* Copyright (c) 2022. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema, Attributes, ObjectInput, ObjectOutput } from './command'

/**
 * Input object of `std:account:enable` command
 */
export type StdAccountEnableInput = ObjectInput & {
	schema?: AccountSchema
}

/**
 * Output object of `std:account:enable` command
 */
export type StdAccountEnableOutput = ObjectOutput & {
	disabled?: boolean
	locked?: boolean
	attributes: Attributes
}
