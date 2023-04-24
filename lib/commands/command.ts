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
	StdEntitlementList = 'std:entitlement:list',
	StdEntitlementRead = 'std:entitlement:read',
	StdSpecRead = 'std:spec:read',
	StdTestConnection = 'std:test-connection',
	StdChangePassword = 'std:change-password',
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

/**
 * SchemaAttribute defines an attribute for schema
 */
export type SchemaAttribute = {
	name: string,
	description: string,
	type: string,
	multi?: boolean,
	managed?: boolean,
	entitlement?: boolean
}

/**
 * AccountSchema defines the account schema input
 */
export declare type AccountSchema = {
    displayAttribute: string,
    identityAttribute: string,
    attributes: SchemaAttribute[]
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

export type ObjectOutput = { identity: string, uuid?: string } | { key: Key }

/**
 * State input for stateful command
 */
export type CommandState = {
	[key: string]: any
}
