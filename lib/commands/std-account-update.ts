/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema, Attributes, ObjectInput, ObjectOutput, Result } from './command'

export enum AttributeChangeOp {
	Add = 'Add',
	Set = 'Set',
	Remove = 'Remove',
}

/**
 * Object describing account attribute change
 */
export type AttributeChange = {
	op: AttributeChangeOp
	attribute: string // Attribute from account schema
	value: any // Undefined for "Remove" op
}

/**
 * Input object of `std:account:update` command
 */
export type StdAccountUpdateInput = ObjectInput & {
	changes: AttributeChange[]
	schema?: AccountSchema
	attributeMetadata: Map<string, object>
}

/**
 * Output object of `std:account:update` command
 *
 * All properties are optional for this output
 */
export type StdAccountUpdateOutput = ObjectOutput & {
	disabled?: boolean,
	locked?: boolean,
	attributes?: Attributes,
	results?: Result[]
}
