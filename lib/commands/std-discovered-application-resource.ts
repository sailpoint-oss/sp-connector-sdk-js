/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ConnectorError } from '../error'
import { logger } from '../logger'
import { ResourceLink, ResourceLinkEndpoint, ResourceOutput } from './command'
import { RiskLevel, StdApplicationDiscoveryListOutput } from './std-application-discovery-list'

/**
 * Discovered application resources returned through `std:resource:list`.
 *
 * Scope: everything in this module applies to **discovered applications only**, i.e. resources with
 * `resourceType: 'std:application'` AND `attributes.discovered: true`. `std:application` is also used by
 * connectors that are not discovery connectors; those resources must not be built or validated with this
 * module. Use {@link isDiscoveredApplicationResource} to gate any validation so that every other resource
 * passes through untouched.
 *
 * Nothing here is applied automatically by the SDK: it is opt-in, and `stdResourceList` and
 * `ResourceOutput` are unchanged.
 */

export const STD_APPLICATION_RESOURCE_TYPE = 'std:application' as const

/**
 * Well-known attributes of a discovered application.
 *
 * Derived from `StdApplicationDiscoveryListOutput` so that the field names and types cannot drift from
 * `std:application-discovery:list`. `id` becomes the resource `identity`, and the discovery-only
 * `attributes` bag is replaced by the resource `attributes` themselves.
 *
 * This type intentionally has no index signature so that `Omit`/`Pick` keep working on it
 * (TypeScript collapses `Omit<T, K>` to `{ [x: string]: any }` when `T` has an index signature).
 */
type StdDiscoveredApplicationKnownAttributes = Omit<StdApplicationDiscoveryListOutput, 'id' | 'attributes'> & {
	applicationName: string
	discovered: true
}

/**
 * Attributes of a discovered application returned through `std:resource:list`.
 *
 * Connector-specific attributes are allowed, while the common application fields retain the same types
 * used by `std:application-discovery:list`. Use the canonical names listed in
 * {@link STD_DISCOVERED_APPLICATION_ATTRIBUTE_NAMES}; look-alike names (for example `appURL` instead of
 * `appUrl`) are accepted but logged as a warning by the validator.
 */
export type StdDiscoveredApplicationResourceAttributes = StdDiscoveredApplicationKnownAttributes & {
	[attribute: string]: any
}

export type StdDiscoveredApplicationResourceLinkEndpoint = ResourceLinkEndpoint

/**
 * A link embedded in a discovered application resource.
 *
 * `from.id` must equal the resource `identity`. `to.id` may be empty when the target is resolved later by
 * the platform. The `resourceType` values of both endpoints are not constrained by the SDK.
 */
export type StdDiscoveredApplicationResourceLink = ResourceLink

/**
 * Typed Dataset 2.0 output for discovered applications (`attributes.discovered: true`).
 *
 * Narrows the optional `resourceType` / `resourceLinks` of `ResourceOutput` to required fields. The
 * top-level `classification` of `ResourceOutput` applies to accounts and is not supported here; use
 * `attributes.dataClassification` for applications.
 */
export type StdDiscoveredApplicationResourceOutput = Omit<
	ResourceOutput,
	'classification' | 'resourceType' | 'resourceLinks' | 'attributes'
> & {
	resourceType: typeof STD_APPLICATION_RESOURCE_TYPE
	attributes: StdDiscoveredApplicationResourceAttributes
	resourceLinks: StdDiscoveredApplicationResourceLink[]
}

/**
 * Input accepted by `buildStdDiscoveredApplicationResourceOutput`. `resourceType` and `discovered`
 * are set by the builder; `resourceLinks` defaults to an empty array. `datasetId` is required here (pass the
 * handler's `input.datasetId`); `stdResourceList` and the other `std:resource:*` handlers overwrite it with the
 * command's `datasetId` on every output.
 */
export type StdDiscoveredApplicationResourceBuilderInput = Omit<
	ResourceOutput,
	'attributes' | 'classification' | 'resourceType' | 'resourceLinks'
> & {
	attributes: Omit<StdDiscoveredApplicationKnownAttributes, 'discovered'> & {
		discovered?: true
		[attribute: string]: any
	}
	resourceLinks?: StdDiscoveredApplicationResourceLink[]
}

/**
 * Result of `tryBuildStdDiscoveredApplicationResourceOutput`.
 */
export type StdDiscoveredApplicationResourceBuildResult =
	| { success: true; value: StdDiscoveredApplicationResourceOutput }
	| { success: false; error: ConnectorError }

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
const otherValidatedAttributes = ['groups', 'riskLevel', 'discovered'] as const
const riskLevels: RiskLevel[] = ['High', 'Medium', 'Low']

/**
 * Canonical attribute names of a discovered application. Connector-specific attributes should not reuse
 * these names with different spelling or casing.
 */
export const STD_DISCOVERED_APPLICATION_ATTRIBUTE_NAMES: readonly string[] = [
	...stringAttributes,
	...numberAttributes,
	...booleanAttributes,
	...stringArrayAttributes,
	...otherValidatedAttributes,
]

// Compile-time guard: adding a field to `StdApplicationDiscoveryListOutput` without teaching this
// validator about it fails the build here, so the two cannot silently drift apart.
type ValidatedAttributeName =
	| typeof stringAttributes[number]
	| typeof numberAttributes[number]
	| typeof booleanAttributes[number]
	| typeof stringArrayAttributes[number]
	| typeof otherValidatedAttributes[number]
type AssertNever<T extends never> = T
export type StdDiscoveredApplicationUnvalidatedDiscoveryFields = AssertNever<
	Exclude<keyof Omit<StdApplicationDiscoveryListOutput, 'id' | 'attributes'>, ValidatedAttributeName>
>

function isRecord(value: unknown): value is Record<string, any> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireNonEmptyString(value: unknown, path: string): void {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new ConnectorError(`${path} must be a non-empty string`)
	}
}

function normalizeAttributeName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '')
		.replace(/s$/, '')
}

const canonicalAttributeNames = new Set<string>(STD_DISCOVERED_APPLICATION_ATTRIBUTE_NAMES)
const canonicalByNormalizedName = new Map<string, string>(
	STD_DISCOVERED_APPLICATION_ATTRIBUTE_NAMES.map((name) => [normalizeAttributeName(name), name])
)
const warnedLookalikeAttributes = new Set<string>()

/**
 * Warns (once per attribute name per process) about attributes that look like a misspelled canonical
 * attribute, e.g. `appURL` or `applicationOwners`. Never throws: connector-specific attributes are allowed.
 */
function warnOnLookalikeAttributes(attributes: Record<string, any>): void {
	for (const name of Object.keys(attributes)) {
		if (canonicalAttributeNames.has(name) || warnedLookalikeAttributes.has(name)) {
			continue
		}
		const canonical = canonicalByNormalizedName.get(normalizeAttributeName(name))
		if (canonical !== undefined) {
			warnedLookalikeAttributes.add(name)
			logger.warn(
				{ component: 'std-discovered-application-resource', attribute: name, canonical },
				`Discovered application attribute '${name}' looks like canonical attribute '${canonical}'`
			)
		}
	}
}

function validateOptionalAttributeTypes(attributes: Record<string, any>): void {
	for (const name of stringAttributes) {
		if (attributes[name] !== undefined && typeof attributes[name] !== 'string') {
			throw new ConnectorError(`attributes.${name} must be a string`)
		}
	}
	for (const name of numberAttributes) {
		// Number.isFinite rejects NaN and Infinity, which would otherwise serialize to null.
		if (attributes[name] !== undefined && !Number.isFinite(attributes[name])) {
			throw new ConnectorError(`attributes.${name} must be a finite number`)
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

function validateResourceLinks(value: unknown, identity: string): void {
	if (!Array.isArray(value)) {
		throw new ConnectorError('resourceLinks must be an array')
	}
	value.forEach((link, index) => {
		if (!isRecord(link)) {
			throw new ConnectorError(`resourceLinks[${index}] must be an object`)
		}
		requireNonEmptyString(link.type, `resourceLinks[${index}].type`)
		validateLinkEndpoint(link.from, `resourceLinks[${index}].from`, true)
		if (link.from.id !== identity) {
			throw new ConnectorError(`resourceLinks[${index}].from.id must equal the resource identity`)
		}
		validateLinkEndpoint(link.to, `resourceLinks[${index}].to`, false)
		if (link.attributes !== undefined && !isRecord(link.attributes)) {
			throw new ConnectorError(`resourceLinks[${index}].attributes must be an object`)
		}
	})
}

/**
 * Returns true only for a discovered application: `resourceType === 'std:application'` and
 * `attributes.discovered === true`.
 *
 * Use this as the gate before any validation, so resources that are not discovered applications
 * (non-discovery `std:application` resources, `discovered: false`, accounts, agents, ...) are left alone.
 */
export function isDiscoveredApplicationResource(
	value: unknown
): value is ResourceOutput & { resourceType: typeof STD_APPLICATION_RESOURCE_TYPE; attributes: { discovered: true } } {
	return (
		isRecord(value) &&
		value.resourceType === STD_APPLICATION_RESOURCE_TYPE &&
		isRecord(value.attributes) &&
		value.attributes.discovered === true
	)
}

/**
 * Runtime validator for a discovered application returned by `std:resource:list`.
 *
 * Applies to discovered applications only and throws for any other value, including a `std:application`
 * without `attributes.discovered: true`. Gate calls with {@link isDiscoveredApplicationResource}.
 *
 * Returns the same object after validation so it can be used at command boundaries.
 */
export function validateStdDiscoveredApplicationResourceOutput(value: unknown): StdDiscoveredApplicationResourceOutput {
	if (!isRecord(value)) {
		throw new ConnectorError('application resource must be an object')
	}
	requireNonEmptyString(value.identity, 'identity')
	requireNonEmptyString(value.datasetId, 'datasetId')
	requireNonEmptyString(value.resourceId, 'resourceId')
	if (value.uuid !== undefined && typeof value.uuid !== 'string') {
		throw new ConnectorError('uuid must be a string')
	}
	for (const flag of ['deleted', 'disabled'] as const) {
		if (value[flag] !== undefined && typeof value[flag] !== 'boolean') {
			throw new ConnectorError(`${flag} must be a boolean`)
		}
	}
	if (value.classification !== undefined) {
		throw new ConnectorError(
			'classification is not supported for discovered applications; use attributes.dataClassification'
		)
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
	validateResourceLinks(value.resourceLinks, value.identity)
	warnOnLookalikeAttributes(value.attributes)
	return value as StdDiscoveredApplicationResourceOutput
}

/**
 * Builds and validates a discovered application resource with the required discriminator.
 *
 * Throws a `ConnectorError` on the first invalid field. Inside a `std:resource:list` loop that fails the
 * whole command; to skip an invalid record instead, use `tryBuildStdDiscoveredApplicationResourceOutput`
 * or catch per record.
 *
 * The input is not mutated, and the returned `attributes` and `resourceLinks` are copies.
 */
export function buildStdDiscoveredApplicationResourceOutput(
	input: StdDiscoveredApplicationResourceBuilderInput
): StdDiscoveredApplicationResourceOutput {
	return validateStdDiscoveredApplicationResourceOutput({
		...input,
		resourceType: STD_APPLICATION_RESOURCE_TYPE,
		attributes: {
			...input.attributes,
			discovered: true,
		},
		resourceLinks: [...(input.resourceLinks ?? [])],
	})
}

/**
 * Non-throwing variant of `buildStdDiscoveredApplicationResourceOutput` for connectors that prefer to log
 * and skip an invalid source record rather than fail the whole `std:resource:list` command.
 */
export function tryBuildStdDiscoveredApplicationResourceOutput(
	input: StdDiscoveredApplicationResourceBuilderInput
): StdDiscoveredApplicationResourceBuildResult {
	try {
		return { success: true, value: buildStdDiscoveredApplicationResourceOutput(input) }
	} catch (error) {
		if (error instanceof ConnectorError) {
			return { success: false, error }
		}
		throw error
	}
}
