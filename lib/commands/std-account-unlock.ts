/* Copyright (c) 2022. SailPoint Technologies, Inc. All rights reserved. */

import { Attributes, ObjectInput, ObjectOutput } from './command'

/**
 * Input object of `std:account:unlock` command
 */
export type StdAccountUnlockInput = ObjectInput

/**
 * Output object of `std:account:unlock` command
 */
export type StdAccountUnlockOutput = ObjectOutput & {
	disabled?: boolean
	locked?: boolean
	attributes: Attributes
}
