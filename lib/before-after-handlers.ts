/* Copyright (c) 202. SailPoint Technologies, Inc. All rights reserved. */

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


export type StdTestConnectionBeforeHandler = (
	context: Context,
	input: undefined
) => Promise<void>

export type StdTestConnectionAfterHandler = (
	context: Context,
	output: StdTestConnectionOutput
) => Promise<StdTestConnectionOutput>

export type StdChangePasswordBeforeHandler = (
	context: Context,
	input: StdChangePasswordInput
) => Promise<StdChangePasswordInput>

export type StdChangePasswordAfterHandler = (
	context: Context,
	output: StdChangePasswordOutput
) => Promise<StdChangePasswordOutput>

export type BeforeAfterHandler = (context: Context, input: any) => Promise<any>
