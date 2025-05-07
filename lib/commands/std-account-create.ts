/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema, Attributes, ObjectOutput, Result } from './command'

/**
 * Object describing account attribute create
 */
export type createAttributeWithMetadata = {
	attribute: string // Attribute from account schema
	value: any // Undefined for "Remove" op
	attributeMetadata: any
}

/**
 * Input object of `std:account:create` command
 */
export type StdAccountCreateInput = {
	identity?: string
	attributes: any
	attributesWithMetadata: createAttributeWithMetadata[]
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
