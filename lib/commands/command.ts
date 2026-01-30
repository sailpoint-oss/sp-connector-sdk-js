/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

/**
 * SailPoint Standard Commands
 */
export enum StandardCommand {
	StdAccountCreate = 'std:account:create',
	StdAccountDelete = 'std:account:delete',
	StdAccountDisable = 'std:account:disable',
	StdAccountDiscoverSchema = "std:account:discover-schema",
	StdAccountEnable = 'std:account:enable',
	StdAccountList = 'std:account:list',
	StdAccountRead = 'std:account:read',
	StdAccountUnlock = 'std:account:unlock',
	StdAccountUpdate = 'std:account:update',
	StdAgentList = 'std:agent:list',
	StdMachineIdentityList = 'std:machine-identity:list',
	StdResourceList = 'std:resource:list',
	StdAuthenticate = 'std:authenticate',
	StdEntitlementList = 'std:entitlement:list',
	StdEntitlementRead = 'std:entitlement:read',
	StdSpecRead = 'std:spec:read',
	StdTestConnection = 'std:test-connection',
	StdChangePassword = 'std:change-password',
	StdSourceDataDiscover = 'std:source-data:discover',
	StdSourceDataRead = 'std:source-data:read',
	StdConfigOptions = 'std:config-options:read',
	StdApplicationDiscoveryList = 'std:application-discovery:list',
	StdSsfStreamDiscover = 'std:ssf-stream:discover',
    StdSsfStreamRead = 'std:ssf-stream:read',
    StdSsfStreamCreate = 'std:ssf-stream:create',
    StdSsfStreamUpdate = 'std:ssf-stream:update',
    StdSsfStreamStatusUpdate = 'std:ssf-stream:status-update',
    StdSsfStreamDelete = 'std:ssf-stream:delete',
    StdSsfStreamVerify = 'std:ssf-stream:verify',
    StdSsfStreamReplace = 'std:ssf-stream:replace',
}

/**
 * Attributes map for account or entitlement
 *
 * Supported value types are:
 * - boolean
 * - string
 * - integer
 * - null
 * - string[] or integer[] for multi-valued attributes
 */
export type Attributes = {
	[attribute: string]: boolean | string | string[] | number | number[] | null
}

export type Permission = {
	target: string
	rights: string
	annotation?: string
}

/**
 * SchemaAttribute defines an attribute for schema
 */
export type SchemaAttribute = {
	name: string
	description: string
	type: string
	required?: boolean
	multi?: boolean
	managed?: boolean
	schemaObjectType?: string
	entitlement?: boolean
}

/**
 * Configuration defines datasetType and datasetId for schema
 */
export type DatasetConfig = {
	datasetType: string
	datasetId: string
}

/*
 * SimpleKey for accounts or entitlements which only have a single identifier.
 */
export type SimpleKeyType = {
	simple: {
		id: string
	}
}

/*
 * CompoundKey for accounts or entitlements which have distinct identifiers for
 * API lookup and unique id.
 */
export type CompoundKeyType = {
	compound: {
		lookupId: string
		uniqueId: string
	}
}

export type Key = SimpleKeyType | CompoundKeyType

/*
 * Extract ID for simple key
 */
export function KeyID(input: { key: Key }): string {
	if ("simple" in input.key) {
		return input.key.simple.id
	} else {
		throw new Error("expected simple key type")
	}
}

/*
 * Extract Lookup ID for compound key
 */
export function KeyLookupID(input: { key: Key }): string {
	if ("compound" in input.key) {
		return input.key.compound.lookupId
	} else {
		throw new Error("expected compound key type")
	}
}

/*
 * Extract Unique ID for compound key
 */
export function KeyUniqueID(input: { key: Key }): string {
	if ("compound" in input.key) {
		return input.key.compound.uniqueId
	} else {
		throw new Error("expected compound key type")
	}
}

/*
 * Build SimpleKey
 */
export function SimpleKey(id: string): SimpleKeyType {
	return {
		simple: { id: id }
	}
}

/*
 * Build CompoundKey
 */
export function CompoundKey(lookupId: string, uniqueId: string): CompoundKeyType {
	return {
		compound: { lookupId: lookupId, uniqueId: uniqueId }
	}
}

export type ObjectInput = {
	identity: string
	key: Key
}

export type ObjectOutput = { identity?: string, uuid?: string } & { key?: Key }

/**
 * State input for stateful command
 */
export type CommandState = {
	[key: string]: any
}

/**
 * The common schema
 */
export type Schema = {
	displayAttribute: string
	identityAttribute: string
	attributes: SchemaAttribute[]
}

/**
 * Account schema
 */
export type AccountSchema = Schema & {
	groupAttribute: string
}

/**
 * Entitlement schema
 */
export type EntitlementSchema = Schema & {
	type: string,
	includePermissions?: boolean
}

/**
 * Dataset schema
 * name is the name of the dataset being set by connector author from connector_spec.json, different from datasetId and datasetType
 * groupAttribute is the name of the attribute for grouping the dataset
 * config is the object contains datasetType and datasetId to identify the current dataset
 */
export type DatasetSchema = Schema & {
	name: string,
	groupAttribute?: string,
	config: DatasetConfig
}

/**
 * Granular result for an attribute to indicate partial attribute level success & warning & failure
 */
export type Result = {
	attribute: string,
	status?: ResultStatus,
	messages?: ResultMessage[]
}

/**
 * Status for result
 */
export enum ResultStatus {
	Error = 'error',
}

/**
 * Warning or error message for a result
 */
export type ResultMessage = {
	level: ResultMessageLevel,
	message: string
}

/**
 * Level for result message
 */
export enum ResultMessageLevel {
	WARN = 'WARN',
	ERROR = 'ERROR',
}

/**
 * Data type for config options
 */
export type ConfigOptions = {
	[options: string]: string | string[] | Record<string, string>[]
}
