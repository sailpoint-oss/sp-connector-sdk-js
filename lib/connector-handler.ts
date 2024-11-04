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
