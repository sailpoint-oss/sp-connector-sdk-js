/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema, Attributes, ObjectOutput, Result } from './command'

/**
 * Object describing account attribute create
 */
export type Attribute = {
	attribute: string // Attribute from account schema
	value: any
	arguments: any // metadata for AttributeRequest
}

/**
 * Input object of `std:account:create` command
 */
export type StdAccountCreateInput = {
	identity?: string
	attributes: any | Attribute
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
