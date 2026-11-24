/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ConnectorError } from '../error'
import { ResourceOutput } from './command'
import { RiskLevel } from './std-application-discovery-list'

export const STD_APPLICATION_RESOURCE_TYPE = 'std:application' as const

/**
 * Well-known attributes of a discovered application returned through `std:resource:list`.
 *
 * This type intentionally has no index signature so that `Omit`/`Pick` keep working on it
 * (TypeScript collapses `Omit<T, K>` to `{ [x: string]: any }` when `T` has an index signature).
 */
type StdApplicationResourceKnownAttributes = {
	applicationName: string
	primaryAppName: string
	description: string
	discovered: true
	secondaryAppName?: string
	status?: string
	connectorCategory?: string
	licenseCount?: number
	isSanctioned?: boolean
	logo?: string
	appUrl?: string
	groups?: Record<string, any>[]
	createdAt?: string
	updatedAt?: string
	usersCount?: string
	applicationOwner?: string[]
	itApplicationOwner?: string[]
	businessCriticality?: string
	dataClassification?: string
	businessUnit?: string
	installType?: string
	environment?: string
	riskScore?: number
	riskLevel?: RiskLevel
	isBusiness?: boolean
	totalSigninsCount?: number
	isPrivileged?: boolean
	warrantyExpiration?: string
	operationalStatus?: string
}

/**
 * Attributes shared by discovered applications returned through `std:resource:list`.
 *
 * Connector-specific attributes are allowed, while common application fields retain
 * the same types used by `std:application-discovery:list`.
 */
export type StdApplicationResourceAttributes = StdApplicationResourceKnownAttributes & {
	[attribute: string]: any
}

export type StdApplicationResourceLinkEndpoint = {
	id: string
	resourceType: string
	attributes?: Record<string, any>
}

export type StdApplicationResourceLink = {
	type: string
	from: StdApplicationResourceLinkEndpoint
	to: StdApplicationResourceLinkEndpoint
	attributes?: Record<string, any>
}

/**
 * Typed Dataset 2.0 output for discovered applications.
 */
export type StdApplicationResourceOutput = ResourceOutput & {
	resourceType: typeof STD_APPLICATION_RESOURCE_TYPE
	attributes: StdApplicationResourceAttributes
	resourceLinks: StdApplicationResourceLink[]
}

/**
 * Input accepted by `buildStdApplicationResourceOutput`. `resourceType` and `discovered`
 * are set by the builder; `resourceLinks` defaults to an empty array.
 */
export type StdApplicationResourceBuilderInput = Omit<ResourceOutput, 'attributes'> & {
	attributes: Omit<StdApplicationResourceKnownAttributes, 'discovered'> & {
		discovered?: true
		[attribute: string]: any
	}
	resourceLinks?: StdApplicationResourceLink[]
}

const stringAttributes = [
	'applicationName',
	'primaryAppName',
	'description',
	'secondaryAppName',
	'status',
	'connectorCategory',
	'logo',
	'appUrl',
	'createdAt',
	'updatedAt',
	'usersCount',
	'businessCriticality',
	'dataClassification',
	'businessUnit',
	'installType',
	'environment',
	'warrantyExpiration',
	'operationalStatus',
] as const

const numberAttributes = ['licenseCount', 'riskScore', 'totalSigninsCount'] as const
const booleanAttributes = ['isSanctioned', 'isBusiness', 'isPrivileged'] as const
const stringArrayAttributes = ['applicationOwner', 'itApplicationOwner'] as const
const riskLevels: RiskLevel[] = ['High', 'Medium', 'Low']

function isRecord(value: unknown): value is Record<string, any> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireNonEmptyString(value: unknown, path: string): void {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new ConnectorError(`${path} must be a non-empty string`)
	}
}

function validateOptionalAttributeTypes(attributes: Record<string, any>): void {
	for (const name of stringAttributes) {
		if (attributes[name] !== undefined && typeof attributes[name] !== 'string') {
			throw new ConnectorError(`attributes.${name} must be a string`)
		}
	}
	for (const name of numberAttributes) {
		if (attributes[name] !== undefined && typeof attributes[name] !== 'number') {
			throw new ConnectorError(`attributes.${name} must be a number`)
		}
	}
	for (const name of booleanAttributes) {
		if (attributes[name] !== undefined && typeof attributes[name] !== 'boolean') {
			throw new ConnectorError(`attributes.${name} must be a boolean`)
		}
	}
	for (const name of stringArrayAttributes) {
		if (
			attributes[name] !== undefined &&
			(!Array.isArray(attributes[name]) || attributes[name].some((value: unknown) => typeof value !== 'string'))
		) {
			throw new ConnectorError(`attributes.${name} must be an array of strings`)
		}
	}
	if (
		attributes.groups !== undefined &&
		(!Array.isArray(attributes.groups) || attributes.groups.some((value: unknown) => !isRecord(value)))
	) {
		throw new ConnectorError('attributes.groups must be an array of objects')
	}
	if (attributes.riskLevel !== undefined && !riskLevels.includes(attributes.riskLevel)) {
		throw new ConnectorError('attributes.riskLevel must be High, Medium, or Low')
	}
}

function validateLinkEndpoint(value: unknown, path: string, requireId: boolean): void {
	if (!isRecord(value)) {
		throw new ConnectorError(`${path} must be an object`)
	}
	if (requireId) {
		requireNonEmptyString(value.id, `${path}.id`)
	} else if (typeof value.id !== 'string') {
		// The target of a link may be resolved by the platform later, so an empty id is allowed.
		throw new ConnectorError(`${path}.id must be a string`)
	}
	requireNonEmptyString(value.resourceType, `${path}.resourceType`)
	if (value.attributes !== undefined && !isRecord(value.attributes)) {
		throw new ConnectorError(`${path}.attributes must be an object`)
	}
}

function validateResourceLinks(value: unknown): void {
	if (!Array.isArray(value)) {
		throw new ConnectorError('resourceLinks must be an array')
	}
	value.forEach((link, index) => {
		if (!isRecord(link)) {
			throw new ConnectorError(`resourceLinks[${index}] must be an object`)
		}
		requireNonEmptyString(link.type, `resourceLinks[${index}].type`)
		validateLinkEndpoint(link.from, `resourceLinks[${index}].from`, true)
		validateLinkEndpoint(link.to, `resourceLinks[${index}].to`, false)
		if (link.attributes !== undefined && !isRecord(link.attributes)) {
			throw new ConnectorError(`resourceLinks[${index}].attributes must be an object`)
		}
	})
}

/**
 * Runtime validator for a discovered application returned by `std:resource:list`.
 *
 * Returns the same object after validation so it can be used at command boundaries.
 */
export function validateStdApplicationResourceOutput(value: unknown): StdApplicationResourceOutput {
	if (!isRecord(value)) {
		throw new ConnectorError('application resource must be an object')
	}
	requireNonEmptyString(value.identity, 'identity')
	requireNonEmptyString(value.datasetId, 'datasetId')
	requireNonEmptyString(value.resourceId, 'resourceId')
	if (value.uuid !== undefined && typeof value.uuid !== 'string') {
		throw new ConnectorError('uuid must be a string')
	}
	if (value.resourceType !== STD_APPLICATION_RESOURCE_TYPE) {
		throw new ConnectorError(`resourceType must be ${STD_APPLICATION_RESOURCE_TYPE}`)
	}
	if (!isRecord(value.attributes)) {
		throw new ConnectorError('attributes must be an object')
	}
	if (value.attributes.discovered !== true) {
		throw new ConnectorError('attributes.discovered must be true')
	}
	requireNonEmptyString(value.attributes.applicationName, 'attributes.applicationName')
	requireNonEmptyString(value.attributes.primaryAppName, 'attributes.primaryAppName')
	if (typeof value.attributes.description !== 'string') {
		throw new ConnectorError('attributes.description must be a string')
	}
	validateOptionalAttributeTypes(value.attributes)
	validateResourceLinks(value.resourceLinks)
	return value as StdApplicationResourceOutput
}

/**
 * Builds and validates a discovered application resource with the required discriminator.
 */
export function buildStdApplicationResourceOutput(
	input: StdApplicationResourceBuilderInput
): StdApplicationResourceOutput {
	return validateStdApplicationResourceOutput({
		...input,
		resourceType: STD_APPLICATION_RESOURCE_TYPE,
		attributes: {
			...input.attributes,
			discovered: true,
		},
		resourceLinks: input.resourceLinks ?? [],
	})
}
