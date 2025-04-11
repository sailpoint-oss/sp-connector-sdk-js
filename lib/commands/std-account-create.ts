/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema, Attributes, ObjectOutput, Result } from './command'

/**
 * Input object of `std:account:create` command
 */
export type StdAccountCreateInput = {
	identity?: string
	attributes: any
	attributeMetadata: Map<string, object>
	schema?: AccountSchema
}

/**
 * Output object of `std:account:create` command
 */
export type StdAccountCreateOutput = ObjectOutput & {
	disabled?: boolean
	locked?: boolean
	attributes: Attributes,
	results?: Result[]
}
