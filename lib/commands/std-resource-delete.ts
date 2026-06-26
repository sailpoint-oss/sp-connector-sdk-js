/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectInput, ResourceInput, ResourceOutput } from './command'

/**
 * Input object of `std:resource:delete` command
 */
export type StdResourceDeleteInput = ObjectInput & ResourceInput & {
	resourceId: string
}

/**
 * Output object of `std:resource:delete` command
 */
export type StdResourceDeleteOutput = ResourceOutput
