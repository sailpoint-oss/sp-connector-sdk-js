/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectInput, ResourceSchema, Result } from './command'

/**
 * Input object of `std:resource:delete` command
 */
export type StdResourceDeleteInput = ObjectInput & {
	schema?: ResourceSchema
	options?: Record<string, unknown>
}

/**
 * Output object of `std:resource:delete` command
 */
export type StdResourceDeleteOutput = {
	results?: Result[]
}
