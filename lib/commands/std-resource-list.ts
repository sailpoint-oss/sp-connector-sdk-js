/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ResourceInput, ResourceOutput, Schema } from './command'

/**
 * Input object of `std:resource:list` command
 */
export type StdResourceListInput = ResourceInput & {
	schemas?: Schema[]
}

/**
 * Output object of `std:resource:list` command
 */
export type StdResourceListOutput = ResourceOutput
