/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import {
	StdAccountCreateInput,
	StdAccountCreateOutput,
	StdAccountDeleteInput,
	StdAccountDeleteOutput,
	StdAccountDisableInput,
	StdAccountDisableOutput,
	StdAccountDiscoverSchemaOutput,
	StdAccountEnableInput,
	StdAccountEnableOutput,
	StdAccountListOutput,
	StdAccountReadInput,
	StdAccountReadOutput,
	StdAccountUnlockInput,
	StdAccountUnlockOutput,
	StdAccountUpdateInput,
	StdAccountUpdateOutput,
	StdEntitlementListInput,
	StdEntitlementListOutput,
	StdEntitlementReadInput,
	StdEntitlementReadOutput,
	StdTestConnectionOutput,
	StdChangePasswordInput,
	StdChangePasswordOutput,
	StdAccountListInput
} from './commands'
import { Context } from './handler'


export type StdTestConnectionPreHandler = (
	context: Context,
	input: undefined
) => Promise<void>

export type StdTestConnectionPostHandler = (
	context: Context,
	output: StdTestConnectionOutput
) => Promise<StdTestConnectionOutput>

export type StdChangePasswordPreHandler = (
	context: Context,
	input: StdChangePasswordInput
) => Promise<StdChangePasswordInput>

export type StdChangePasswordPostHandler = (
	context: Context,
	output: StdChangePasswordInput | StdChangePasswordOutput
) => Promise<StdChangePasswordInput | StdChangePasswordOutput>

export type PrePostHandler = (context: Context, input: any) => Promise<any>
