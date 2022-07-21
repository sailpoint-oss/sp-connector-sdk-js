/* Copyright (c) 2022. SailPoint Technologies, Inc. All rights reserved. */

import { Attributes, ObjectInput, ObjectOutput } from './command'

/**
 * Input object of `std:account:disable` command
 */
export type StdAccountDisableInput = ObjectInput

/**
 * Output object of `std:account:disable` command
 */
export type StdAccountDisableOutput = ObjectOutput & {
	disabled?: boolean
	locked?: boolean
	attributes: Attributes
}
