/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectInput, ObjectOutput, ResourceSchema } from './command'

/**
 * Input object of `std:resource:delete` command
 */
export type StdResourceDeleteInput = ObjectInput & {
	datasetId: string
	resourceId: string
	schema?: ResourceSchema
}

/**
 * Output object of `std:resource:delete` command
 */
export type StdResourceDeleteOutput = ObjectOutput & {
	resourceId: string
	attributes: Record<string, any>
	deleted?: boolean
}
