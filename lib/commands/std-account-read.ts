/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Attributes, ObjectInput, ObjectOutput } from './command'

/**
 * Input object of `std:account:read` command
 */
export type StdAccountReadInput = ObjectInput

/**
 * Output object of `std:account:read` command
 */
export type StdAccountReadOutput = ObjectOutput & {
	disabled?: boolean
	locked?: boolean
	attributes: Attributes
}
