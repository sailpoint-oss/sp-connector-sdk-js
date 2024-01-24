/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema } from './command'

/**
 * Input object of `std:test-connection` command
 */
export type StdTestConnectionInput = {
	account_schema?: AccountSchema
}

/**
 * Output object of `std:test-connection` command
 */
export type StdTestConnectionOutput = {}
