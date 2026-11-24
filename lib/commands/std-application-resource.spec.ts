/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ConnectorError, ConnectorErrorType } from '../error'
import * as publicApi from './index'
import {
	buildStdApplicationResourceOutput,
	STD_APPLICATION_RESOURCE_TYPE,
	StdApplicationResourceBuilderInput,
	validateStdApplicationResourceOutput,
} from './std-application-resource'

const validInput = (): StdApplicationResourceBuilderInput => ({
	identity: 'app-123',
	uuid: 'app-123',
	datasetId: 'cmdb:applications',
	resourceId: 'cmdb:applications',
	attributes: {
		applicationName: 'GitHub',
		primaryAppName: 'GitHub',
		description: 'Source code management',
		applicationOwner: ['Jane Doe'],
		riskLevel: 'Low' as const,
	},
	resourceLinks: [
		{
			type: 'owned_by',
			from: { id: 'app-123', resourceType: 'discovered_application' },
			to: {
				id: '',
				resourceType: 'account',
				attributes: { displayName: 'Jane Doe', targetApp: 'ServiceNow' },
			},
			attributes: { ownershipType: 'Business' },
		},
	],
})

describe('StdApplicationResourceOutput', () => {
	it('builds a discovered application with the required discriminator and label', () => {
		const output = buildStdApplicationResourceOutput(validInput())

		expect(output.resourceType).toBe(STD_APPLICATION_RESOURCE_TYPE)
		expect(output.attributes.discovered).toBe(true)
		expect(output.attributes.applicationName).toBe('GitHub')
		expect(output.resourceLinks).toHaveLength(1)
	})

	it('defaults resourceLinks to an empty array', () => {
		const input = validInput()
		delete input.resourceLinks

		expect(buildStdApplicationResourceOutput(input).resourceLinks).toEqual([])
	})

	it('returns a valid application resource unchanged', () => {
		const output = buildStdApplicationResourceOutput(validInput())

		expect(validateStdApplicationResourceOutput(output)).toBe(output)
	})

	it.each([
		['wrong resource type', { resourceType: 'std:account' }, 'resourceType must be std:application'],
		['missing discovered label', { attributes: { discovered: false } }, 'attributes.discovered must be true'],
		[
			'blank application name',
			{ attributes: { applicationName: '' } },
			'attributes.applicationName must be a non-empty string',
		],
		[
			'invalid owners',
			{ attributes: { applicationOwner: 'Jane Doe' } },
			'attributes.applicationOwner must be an array of strings',
		],
		[
			'invalid risk level',
			{ attributes: { riskLevel: 'Critical' } },
			'attributes.riskLevel must be High, Medium, or Low',
		],
		['invalid links', { resourceLinks: {} }, 'resourceLinks must be an array'],
	])('rejects %s', (_name, override, expectedMessage) => {
		const validOutput = buildStdApplicationResourceOutput(validInput())
		const candidate = {
			...validOutput,
			...override,
			...('attributes' in override ? { attributes: { ...validOutput.attributes, ...override.attributes } } : {}),
		}

		expect(() => validateStdApplicationResourceOutput(candidate)).toThrow(expectedMessage)
	})

	it('rejects malformed resource link endpoints', () => {
		const validOutput = buildStdApplicationResourceOutput(validInput())
		const resourceLinks = [
			{
				...validOutput.resourceLinks[0],
				to: { id: '', resourceType: '' },
			},
		]

		expect(() => validateStdApplicationResourceOutput({ ...validOutput, resourceLinks })).toThrow(
			'resourceLinks[0].to.resourceType must be a non-empty string'
		)
	})

	it('accepts every typed optional application attribute', () => {
		const input = validInput()
		input.attributes = {
			...input.attributes,
			secondaryAppName: 'GitHub Enterprise',
			status: 'Operational',
			connectorCategory: 'cmdb',
			licenseCount: 10,
			isSanctioned: true,
			logo: 'https://example.test/logo.png',
			appUrl: 'https://github.com',
			groups: [{ id: 'group-1' }],
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-02T00:00:00Z',
			usersCount: '5',
			applicationOwner: ['Jane Doe'],
			itApplicationOwner: ['John Doe'],
			businessCriticality: 'Low',
			dataClassification: 'Public',
			businessUnit: 'Engineering',
			installType: 'Cloud',
			environment: 'Production',
			riskScore: 1,
			riskLevel: 'Low',
			isBusiness: true,
			totalSigninsCount: 100,
			isPrivileged: false,
			warrantyExpiration: '2027-01-01',
			operationalStatus: 'Operational',
		}

		expect(buildStdApplicationResourceOutput(input).attributes).toMatchObject(input.attributes)
	})

	it.each([
		[null, 'application resource must be an object'],
		[[], 'application resource must be an object'],
		[{ identity: '' }, 'identity must be a non-empty string'],
		[{ ...buildStdApplicationResourceOutput(validInput()), datasetId: '' }, 'datasetId must be a non-empty string'],
		[
			{ ...buildStdApplicationResourceOutput(validInput()), resourceId: '' },
			'resourceId must be a non-empty string',
		],
		[{ ...buildStdApplicationResourceOutput(validInput()), attributes: [] }, 'attributes must be an object'],
		[
			{
				...buildStdApplicationResourceOutput(validInput()),
				attributes: { ...buildStdApplicationResourceOutput(validInput()).attributes, primaryAppName: '' },
			},
			'attributes.primaryAppName must be a non-empty string',
		],
		[
			{
				...buildStdApplicationResourceOutput(validInput()),
				attributes: { ...buildStdApplicationResourceOutput(validInput()).attributes, description: 1 },
			},
			'attributes.description must be a string',
		],
	])('rejects malformed application resources', (value, expectedMessage) => {
		expect(() => validateStdApplicationResourceOutput(value)).toThrow(expectedMessage)
	})

	it.each([
		['status', 1, 'attributes.status must be a string'],
		['licenseCount', '10', 'attributes.licenseCount must be a number'],
		['isSanctioned', 'yes', 'attributes.isSanctioned must be a boolean'],
		['itApplicationOwner', [1], 'attributes.itApplicationOwner must be an array of strings'],
		['groups', 'group-1', 'attributes.groups must be an array of objects'],
		['groups', ['group-1'], 'attributes.groups must be an array of objects'],
	])('rejects malformed %s attributes', (name, value, expectedMessage) => {
		const output = buildStdApplicationResourceOutput(validInput())
		output.attributes[name] = value

		expect(() => validateStdApplicationResourceOutput(output)).toThrow(expectedMessage)
	})

	it('throws the SDK ConnectorError so handlers can classify it consistently', () => {
		expect.assertions(2)
		try {
			validateStdApplicationResourceOutput(null)
		} catch (e) {
			expect(e).toBeInstanceOf(ConnectorError)
			expect((e as ConnectorError).type).toBe(ConnectorErrorType.Generic)
		}
	})

	it('rejects a non-string uuid and a blank link source id', () => {
		const output = buildStdApplicationResourceOutput(validInput())

		expect(() => validateStdApplicationResourceOutput({ ...output, uuid: 1 })).toThrow('uuid must be a string')
		expect(() =>
			validateStdApplicationResourceOutput({
				...output,
				resourceLinks: [{ ...output.resourceLinks[0], from: { id: ' ', resourceType: 'application' } }],
			})
		).toThrow('resourceLinks[0].from.id must be a non-empty string')
		expect(() =>
			validateStdApplicationResourceOutput({
				...output,
				resourceLinks: [{ ...output.resourceLinks[0], to: { id: undefined, resourceType: 'account' } }],
			})
		).toThrow('resourceLinks[0].to.id must be a string')
	})

	it('does not mutate the builder input and keeps connector-specific attributes', () => {
		const input = validInput()
		input.attributes.customerSpecific = 'kept'
		const snapshot = JSON.parse(JSON.stringify(input))

		const output = buildStdApplicationResourceOutput(input)

		expect(input).toEqual(snapshot)
		expect(input.attributes).not.toHaveProperty('discovered')
		expect(output.attributes.customerSpecific).toBe('kept')
		expect(output.attributes).not.toBe(input.attributes)
	})

	it('is exported from the public commands entry point', () => {
		expect(publicApi.buildStdApplicationResourceOutput).toBe(buildStdApplicationResourceOutput)
		expect(publicApi.validateStdApplicationResourceOutput).toBe(validateStdApplicationResourceOutput)
		expect(publicApi.STD_APPLICATION_RESOURCE_TYPE).toBe('std:application')
	})

	it('enforces required attributes and the discriminator at compile time', () => {
		const attributes = validInput().attributes
		const { applicationName: _applicationName, ...withoutName } = attributes

		// @ts-expect-error applicationName is required by the builder input type
		const missingName: StdApplicationResourceBuilderInput['attributes'] = withoutName
		// @ts-expect-error resourceType is set by the builder and not accepted as input
		const withType: StdApplicationResourceBuilderInput = { ...validInput(), resourceType: 'std:account' }

		expect(missingName).toBeDefined()
		expect(withType).toBeDefined()
	})

	it.each([
		[[null], 'resourceLinks[0] must be an object'],
		[[{ type: '', from: {}, to: {} }], 'resourceLinks[0].type must be a non-empty string'],
		[[{ type: 'owned_by', from: null, to: {} }], 'resourceLinks[0].from must be an object'],
		[
			[{ type: 'owned_by', from: { id: 1, resourceType: 'application' }, to: {} }],
			'resourceLinks[0].from.id must be a non-empty string',
		],
		[
			[
				{
					type: 'owned_by',
					from: { id: 'app-123', resourceType: 'application', attributes: [] },
					to: {},
				},
			],
			'resourceLinks[0].from.attributes must be an object',
		],
		[
			[
				{
					type: 'owned_by',
					from: { id: 'app-123', resourceType: 'application' },
					to: { id: '', resourceType: 'account' },
					attributes: [],
				},
			],
			'resourceLinks[0].attributes must be an object',
		],
	])('rejects malformed resource links', (resourceLinks, expectedMessage) => {
		const output = buildStdApplicationResourceOutput(validInput())

		expect(() => validateStdApplicationResourceOutput({ ...output, resourceLinks })).toThrow(expectedMessage)
	})
})
