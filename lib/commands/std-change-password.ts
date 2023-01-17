/* Copyright (c) 2023. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectInput } from "./command"

/**
 * Input object of `std:change-password` command
 */
export type StdChangePasswordInput = ObjectInput & {
	password: string
}

/**
 * Output object of `std:change-password` command
 */
 export type StdChangePasswordOutput = {}
