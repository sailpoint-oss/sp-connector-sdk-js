/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { Attributes, ObjectInput, ObjectOutput, ResourceSchema, Result } from './command'

/**
 * Input object of `std:resource:enable` command
 */
export type StdResourceEnableInput = ObjectInput & {
	schema?: ResourceSchema
	options?: Record<string, unknown>
}

/**
 * Output object of `std:resource:enable` command
 */
export type StdResourceEnableOutput = ObjectOutput & {
	attributes: Attributes
	results?: Result[]
}
