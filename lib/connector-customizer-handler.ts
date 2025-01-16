/* Copyright (c) 2023. SailPoint Technologies, Inc. All rights reserved. */

import {
	StdAccountCreateInput,
	StdAccountCreateOutput,
	StdAccountReadInput,
	StdAccountReadOutput,
	StdAccountUpdateInput,
	StdAccountUpdateOutput,
	StdAccountDeleteInput,
	StdAccountDeleteOutput,
	StdAccountEnableInput,
	StdAccountEnableOutput,
	StdAccountDisableInput,
	StdAccountDisableOutput,
	StdAccountUnlockInput,
	StdAccountUnlockOutput,
	StdAccountListInput,
	StdAuthenticateInput,
	StdAuthenticateOutput,
	StdConfigOptionsInput,
	StdConfigOptionsOutput,
	StdApplicationDiscoveryInputList,
	StdApplicationDiscoveryOutputList,
	StdEntitlementReadInput,
	StdEntitlementReadOutput,
	StdEntitlementListInput,
	StdTestConnectionInput,
	StdTestConnectionOutput,
	StdChangePasswordInput,
	StdChangePasswordOutput,
	StdSourceDataDiscoverInput,
	StdSourceDataReadInput,
	StdSourceDataDiscoverOutput,
	StdSourceDataReadOutput,
	StdAccountListOutput,
} from './commands'
import { Context } from './connector-handler'


export type StdTestConnectionBeforeHandler = (
	context: Context,
	input: StdTestConnectionInput
) => Promise<StdTestConnectionInput>

export type StdTestConnectionAfterHandler = (
	context: Context,
	output: StdTestConnectionOutput
) => Promise<StdTestConnectionOutput>

export type StdAccountCreateBeforeHandler = (
	context: Context,
	input: StdAccountCreateInput
) => Promise<StdAccountCreateInput>

export type StdAccountCreateAfterHandler = (
	context: Context,
	output: StdAccountCreateOutput
) => Promise<StdAccountCreateOutput>

export type StdAccountReadBeforeHandler = (
	context: Context,
	input: StdAccountReadInput
) => Promise<StdAccountReadInput>

export type StdAccountReadAfterHandler = (
	context: Context,
	output: StdAccountReadOutput
) => Promise<StdAccountReadOutput>

export type StdAccountUpdateBeforeHandler = (
	context: Context,
	input: StdAccountUpdateInput
) => Promise<StdAccountUpdateInput>

export type StdAccountUpdateAfterHandler = (
	context: Context,
	output: StdAccountUpdateOutput
) => Promise<StdAccountUpdateOutput>

export type StdAccountDeleteBeforeHandler = (
	context: Context,
	input: StdAccountDeleteInput
) => Promise<StdAccountDeleteInput>

export type StdAccountDeleteAfterHandler = (
	context: Context,
	output: StdAccountDeleteOutput
) => Promise<StdAccountDeleteOutput>

export type StdAccountEnableBeforeHandler = (
	context: Context,
	input: StdAccountEnableInput
) => Promise<StdAccountEnableInput>

export type StdAccountEnableAfterHandler = (
	context: Context,
	output: StdAccountEnableOutput
) => Promise<StdAccountEnableOutput>

export type StdAccountDisableBeforeHandler = (
	context: Context,
	input: StdAccountDisableInput
) => Promise<StdAccountDisableInput>

export type StdAccountDisableAfterHandler = (
	context: Context,
	output: StdAccountDisableOutput
) => Promise<StdAccountDisableOutput>

export type StdAccountUnlockBeforeHandler = (
	context: Context,
	input: StdAccountUnlockInput
) => Promise<StdAccountUnlockInput>

export type StdAccountUnlockAfterHandler = (
	context: Context,
	output: StdAccountUnlockOutput
) => Promise<StdAccountUnlockOutput>

export type StdAccountListBeforeHandler = (
	context: Context,
	input: StdAccountListInput
) => Promise<StdAccountListInput>

export type StdAccountListAfterHandler = (
	context: Context,
	input: StdAccountListOutput
) => Promise<StdAccountListOutput>


export type StdAuthenticateBeforeHandler = (
	context: Context,
	input: StdAuthenticateInput
) => Promise<StdAuthenticateInput>

export type StdAuthenticateAfterHandler = (
	context: Context,
	output: StdAuthenticateOutput
) => Promise<StdAuthenticateOutput>

export type StdEntitlementReadBeforeHandler = (
	context: Context,
	input: StdEntitlementReadInput
) => Promise<StdEntitlementReadInput>

export type StdEntitlementReadAfterHandler = (
	context: Context,
	output: StdEntitlementReadOutput
) => Promise<StdEntitlementReadOutput>

export type StdEntitlementListBeforeHandler = (
	context: Context,
	input: StdEntitlementListInput
) => Promise<StdEntitlementListInput>

export type StdChangePasswordBeforeHandler = (
	context: Context,
	input: StdChangePasswordInput
) => Promise<StdChangePasswordInput>

export type StdChangePasswordAfterHandler = (
	context: Context,
	output: StdChangePasswordOutput
) => Promise<StdChangePasswordOutput>

export type StdSourceDataDiscoverBeforeHandler = (
	context: Context,
	input: StdSourceDataDiscoverInput
) => Promise<StdSourceDataDiscoverInput>

export type StdSourceDataDiscoverAfterHandler = (
	context: Context,
	output: StdSourceDataDiscoverOutput
) => Promise<StdSourceDataDiscoverOutput>

export type StdSourceDataReadBeforeHandler = (
	context: Context,
	input: StdSourceDataReadInput
) => Promise<StdSourceDataReadInput>

export type StdSourceDataReadAfterHandler = (
	context: Context,
	output: StdSourceDataReadOutput
) => Promise<StdSourceDataReadOutput>

export type ConnectorCustomizerHandler = (context: Context, input: any) => Promise<any>

export type StdConfigOptionsBeforeHandler = (
	context: Context,
	input: StdConfigOptionsInput
) => Promise<StdConfigOptionsInput>

export type StdConfigOptionsAfterHandler = (
	context: Context,
	output: StdConfigOptionsOutput
) => Promise<StdConfigOptionsOutput>

export type StdApplicationDiscoveryListBeforeHandler = (
	context: Context,
	input: StdApplicationDiscoveryInputList
) => Promise<StdApplicationDiscoveryInputList>

export type StdApplicationDiscoveryListAfterHandler = (
	context: Context,
	output: StdApplicationDiscoveryOutputList
) => Promise<StdApplicationDiscoveryOutputList>
