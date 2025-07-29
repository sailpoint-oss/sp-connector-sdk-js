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
	StdAgentListInput,
	StdAgentListOutput,
	StdAuthenticateInput,
	StdAuthenticateOutput,
	StdConfigOptionsInput,
	StdConfigOptionsOutput,
	StdApplicationDiscoveryInputList,
	StdApplicationDiscoveryOutputList,
	StdEntitlementListInput,
	StdEntitlementListOutput,
	StdEntitlementReadInput,
	StdEntitlementReadOutput,
	StdTestConnectionOutput,
	StdChangePasswordInput,
	StdChangePasswordOutput,
	StdAccountListInput,
	StdSourceDataDiscoverInput,
	StdSourceDataDiscoverOutput,
	StdSourceDataReadInput,
	StdSourceDataReadOutput,
	StdTestConnectionInput,
	StdSsfStreamCreateInput,
    StdSsfStreamCreateOutput,
    StdSsfStreamDeleteInput,
    StdSsfStreamDeleteOutput,
    StdSsfStreamDiscoverInput,
    StdSsfStreamDiscoverOutput,
    StdSsfStreamReadInput,
    StdSsfStreamReadOutput,
    StdSsfStreamReplaceInput,
    StdSsfStreamReplaceOutput,
    StdSsfStreamStatusUpdateInput,
    StdSsfStreamStatusUpdateOutput,
    StdSsfStreamUpdateInput,
    StdSsfStreamUpdateOutput,
    StdSsfStreamVerifyInput,
    StdSsfStreamVerifyOutput,
} from './commands'
import { Response } from './response'

/**
 * Connector context object
 */
export interface Context {
	id?: string
	name?: string
	version?: number
	invocationId?: string
	spanId? :string
	requestId?: string
	commandType?: string
	[prop: string]: any

	reloadConfig(): Promise<any>
	assumeAwsRole(assumeAwsRoleRequest: AssumeAwsRoleRequest): Promise<AssumeAwsRoleResponse>;
}
export class AssumeAwsRoleRequest {
	roleArn: string;
	externalId     : string;
	roleSessionName :string;
	constructor(roleArn: string, externalId: string, roleSessionName: string) {
		this.roleArn = roleArn;
		this.externalId = externalId;
		this.roleSessionName = roleSessionName;
	}
}
export class AssumeAwsRoleResponse {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
	expiration : string;
    constructor(accessKeyId: string, secretAccessKey: string, sessionToken: string, expiration: string) {
		this.accessKeyId = accessKeyId;
		this.secretAccessKey = secretAccessKey;
		this.sessionToken = sessionToken;
		this.expiration = expiration;
	}
}
export type StdAccountCreateHandler = (
	context: Context,
	input: StdAccountCreateInput,
	res: Response<StdAccountCreateOutput>
) => Promise<void>
export type StdAccountDeleteHandler = (
	context: Context,
	input: StdAccountDeleteInput,
	res: Response<StdAccountDeleteOutput>
) => Promise<void>
export type StdAccountDisableHandler = (
	context: Context,
	input: StdAccountDisableInput,
	res: Response<StdAccountDisableOutput>
) => Promise<void>
export type StdAccountDiscoverSchemaHandler = (
	context: Context,
	input: undefined,
	res: Response<StdAccountDiscoverSchemaOutput>
) => Promise<void>
export type StdAccountEnableHandler = (
	context: Context,
	input: StdAccountEnableInput,
	res: Response<StdAccountEnableOutput>
) => Promise<void>
export type StdAccountListHandler = (
	context: Context,
	input: StdAccountListInput,
	res: Response<StdAccountListOutput>
) => Promise<void>
export type StdAccountReadHandler = (
	context: Context,
	input: StdAccountReadInput,
	res: Response<StdAccountReadOutput>
) => Promise<void>
export type StdAccountUnlockHandler = (
	context: Context,
	input: StdAccountUnlockInput,
	res: Response<StdAccountUnlockOutput>
) => Promise<void>
export type StdAccountUpdateHandler = (
	context: Context,
	input: StdAccountUpdateInput,
	res: Response<StdAccountUpdateOutput>
) => Promise<void>
export type StdAuthenticateHandler = (
	context: Context,
	input: StdAuthenticateInput,
	res: Response<StdAuthenticateOutput>
) => Promise<void>
export type StdEntitlementListHandler = (
	context: Context,
	input: StdEntitlementListInput,
	res: Response<StdEntitlementListOutput>
) => Promise<void>
export type StdEntitlementReadHandler = (
	context: Context,
	input: StdEntitlementReadInput,
	res: Response<StdEntitlementReadOutput>
) => Promise<void>
export type StdTestConnectionHandler = (
	context: Context,
	input: StdTestConnectionInput,
	res: Response<StdTestConnectionOutput>
) => Promise<void>
export type StdChangePasswordHandler = (
	context: Context,
	input: StdChangePasswordInput,
	res: Response<StdChangePasswordOutput>
) => Promise<void>
export type StdSourceDataDiscoverHandler = (
	context: Context,
	input: StdSourceDataDiscoverInput,
	res: Response<StdSourceDataDiscoverOutput>
) => Promise<void>
export type StdSourceDataReadHandler = (
	context: Context,
	input: StdSourceDataReadInput,
	res: Response<StdSourceDataReadOutput>
) => Promise<void>
export type CommandHandler = (context: Context, input: any, res: Response<any>) => Promise<void>
export type StdConfigOptionsHandler = (
	context: Context,
	input: StdConfigOptionsInput,
	res: Response<StdConfigOptionsOutput>
) => Promise<void>
export type StdApplicationDiscoveryListHandler = (
	context: Context,
	input: StdApplicationDiscoveryInputList,
	res: Response<StdApplicationDiscoveryOutputList>
) => Promise<void>
export type StdSsfStreamCreateHandler = (
    context: Context,
    input: StdSsfStreamCreateInput,
    res: Response<StdSsfStreamCreateOutput>
) => Promise<void>
export type StdSsfStreamDeleteHandler = (
    context: Context,
    input: StdSsfStreamDeleteInput,
    res: Response<StdSsfStreamDeleteOutput>
) => Promise<void>
export type StdSsfStreamDiscoverHandler = (
    context: Context,
    input: StdSsfStreamDiscoverInput,
    res: Response<StdSsfStreamDiscoverOutput>
) => Promise<void>
export type StdSsfStreamReadHandler = (
    context: Context,
    input: StdSsfStreamReadInput,
    res: Response<StdSsfStreamReadOutput>
) => Promise<void>
export type StdSsfStreamReplaceHandler = (
    context: Context,
    input: StdSsfStreamReplaceInput,
    res: Response<StdSsfStreamReplaceOutput>
) => Promise<void>
export type StdSsfStreamStatusUpdateHandler = (
    context: Context,
    input: StdSsfStreamStatusUpdateInput,
    res: Response<StdSsfStreamStatusUpdateOutput>
) => Promise<void>
export type StdSsfStreamUpdateHandler = (
    context: Context,
    input: StdSsfStreamUpdateInput,
    res: Response<StdSsfStreamUpdateOutput>
) => Promise<void>
export type StdSsfStreamVerifyHandler = (
    context: Context,
    input: StdSsfStreamVerifyInput,
    res: Response<StdSsfStreamVerifyOutput>
) => Promise<void>

export type StdAgentListHandler = (
    context: Context,
    input: StdAgentListInput,
    res: Response<StdAgentListOutput>
) => Promise<void>
