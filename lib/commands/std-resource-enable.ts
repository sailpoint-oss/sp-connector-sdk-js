/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectInput, ObjectOutput, ResourceSchema } from './command'

/**
 * Input object of `std:resource:enable` command
 */
export type StdResourceEnableInput = ObjectInput & {
	datasetId: string
	resourceId: string
	schema?: ResourceSchema
}

/**
 * Output object of `std:resource:enable` command
 */
export type StdResourceEnableOutput = ObjectOutput & {
	resourceId: string
	attributes: Record<string, any>
	disabled?: boolean
}
