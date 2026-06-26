/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectInput, ResourceSchema } from './command'

/**
 * Input object of `std:resource:disable` command
 */
export type StdResourceDisableInput = ObjectInput & {
	datasetId: string
	resourceId: string
	schema?: ResourceSchema
}

/**
 * Output object of `std:resource:disable` command
 */
export type StdResourceDisableOutput = {
	identity: string
	resourceId: string
	attributes: Record<string, any>
	disabled?: boolean
}
