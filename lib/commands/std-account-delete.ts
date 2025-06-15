/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema, ObjectInput } from './command'

/**
 * Input object of `std:account:delete` command
 */
export type StdAccountDeleteInput = ObjectInput & {
	schema?: AccountSchema
}

/**
 * Output object of `std:account:delete` command
 */
export type StdAccountDeleteOutput = {}
