/* Copyright (c) 2024. SailPoint Technologies, Inc. All rights reserved. */

import { AccountSchema, Attributes, ObjectInput, ObjectOutput, Permission } from './command'

/**
 * Input object of `std:authenticate` command
 */
export type StdAuthenticateInput = ObjectInput & {
	username: string
	password: string
	options?: any
	schema: AccountSchema
}

/**
 * Output object of `std:authenticate` command
 */
export type StdAuthenticateOutput = ObjectOutput & {
	disabled?: boolean
	locked?: boolean
	attributes: Attributes
	permissions?: Permission[]
}
