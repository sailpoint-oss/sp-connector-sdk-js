/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Attributes, ObjectOutput } from './command'

/**
 * Output object of `std:account:list` command
 */
export type StdAccountListOutput = ObjectOutput & {
	disabled?: boolean
	locked?: boolean
	attributes: Attributes
}
