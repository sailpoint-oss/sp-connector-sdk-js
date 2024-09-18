/* Copyright (c) 2024. SailPoint Technologies, Inc. All rights reserved. */

import {ConfigOptions, ObjectInput, ObjectOutput} from './command'

/**
 * Input object of `std:config-options:read` command
 */
export type StdConfigOptionsInput = ObjectInput & {
    key: string
}

/**
 * Output object of `std:config-options:read` command
 */
export type StdConfigOptionsOutput = ObjectOutput & {
	output: ConfigOptions
}
