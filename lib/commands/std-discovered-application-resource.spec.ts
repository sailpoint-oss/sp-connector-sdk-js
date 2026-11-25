/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ConnectorError, ConnectorErrorType } from '../error'
import { logger } from '../logger'
import * as publicApi from './index'
import {
	buildStdDiscoveredApplicationResourceOutput,
	isDiscoveredApplicationResource,
	STD_APPLICATION_RESOURCE_TYPE,
	STD_DISCOVERED_APPLICATION_ATTRIBUTE_NAMES,
	StdDiscoveredApplicationResourceBuilderInput,
	tryBuildStdDiscoveredApplicationResourceOutput,
	validateStdDiscoveredApplicationResourceOutput,
} from './std-discovered-application-resource'

const validInput = (): StdDiscoveredApplicationResourceBuilderInput => ({
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
			from: { id: 'app-123', resourceType: STD_APPLICATION_RESOURCE_TYPE },
			to: {
				id: '',
				resourceType: 'account',
				attributes: { displayName: 'Jane Doe', targetApp: 'ServiceNow' },
			},
			attributes: { ownershipType: 'Business' },
		},
	],
})

describe('StdDiscoveredApplicationResourceOutput', () => {
	it('builds a discovered application with the required discriminator and label', () => {
		const output = buildStdDiscoveredApplicationResourceOutput(validInput())

		expect(output.resourceType).toBe(STD_APPLICATION_RESOURCE_TYPE)
		expect(output.attributes.discovered).toBe(true)
		expect(output.attributes.applicationName).toBe('GitHub')
		expect(output.resourceLinks).toHaveLength(1)
	})

	it('defaults resourceLinks to an empty array', () => {
		const input = validInput()
		delete input.resourceLinks

		expect(buildStdDiscoveredApplicationResourceOutput(input).resourceLinks).toEqual([])
	})

	it('returns a valid application resource unchanged', () => {
		const output = buildStdDiscoveredApplicationResourceOutput(validInput())

		expect(validateStdDiscoveredApplicationResourceOutput(output)).toBe(output)
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
		const validOutput = buildStdDiscoveredApplicationResourceOutput(validInput())
		const candidate = {
			...validOutput,
			...override,
			...('attributes' in override ? { attributes: { ...validOutput.attributes, ...override.attributes } } : {}),
		}

		expect(() => validateStdDiscoveredApplicationResourceOutput(candidate)).toThrow(expectedMessage)
	})

	it('rejects malformed resource link endpoints', () => {
		const validOutput = buildStdDiscoveredApplicationResourceOutput(validInput())
		const resourceLinks = [
			{
				...validOutput.resourceLinks[0],
				to: { id: '', resourceType: '' },
			},
		]

		expect(() => validateStdDiscoveredApplicationResourceOutput({ ...validOutput, resourceLinks })).toThrow(
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

		expect(buildStdDiscoveredApplicationResourceOutput(input).attributes).toMatchObject(input.attributes)
	})

	it.each([
		[null, 'application resource must be an object'],
		[[], 'application resource must be an object'],
		[{ identity: '' }, 'identity must be a non-empty string'],
		[
			{ ...buildStdDiscoveredApplicationResourceOutput(validInput()), datasetId: '' },
			'datasetId must be a non-empty string',
		],
		[
			{ ...buildStdDiscoveredApplicationResourceOutput(validInput()), resourceId: '' },
			'resourceId must be a non-empty string',
		],
		[
			{ ...buildStdDiscoveredApplicationResourceOutput(validInput()), attributes: [] },
			'attributes must be an object',
		],
		[
			{
				...buildStdDiscoveredApplicationResourceOutput(validInput()),
				attributes: {
					...buildStdDiscoveredApplicationResourceOutput(validInput()).attributes,
					primaryAppName: '',
				},
			},
			'attributes.primaryAppName must be a non-empty string',
		],
		[
			{
				...buildStdDiscoveredApplicationResourceOutput(validInput()),
				attributes: { ...buildStdDiscoveredApplicationResourceOutput(validInput()).attributes, description: 1 },
			},
			'attributes.description must be a string',
		],
	])('rejects malformed application resources', (value, expectedMessage) => {
		expect(() => validateStdDiscoveredApplicationResourceOutput(value)).toThrow(expectedMessage)
	})

	it.each([
		['status', 1, 'attributes.status must be a string'],
		['licenseCount', '10', 'attributes.licenseCount must be a finite number'],
		['isSanctioned', 'yes', 'attributes.isSanctioned must be a boolean'],
		['itApplicationOwner', [1], 'attributes.itApplicationOwner must be an array of strings'],
		['groups', 'group-1', 'attributes.groups must be an array of objects'],
		['groups', ['group-1'], 'attributes.groups must be an array of objects'],
	])('rejects malformed %s attributes', (name, value, expectedMessage) => {
		const output = buildStdDiscoveredApplicationResourceOutput(validInput())
		output.attributes[name] = value

		expect(() => validateStdDiscoveredApplicationResourceOutput(output)).toThrow(expectedMessage)
	})

	it('throws the SDK ConnectorError so handlers can classify it consistently', () => {
		expect.assertions(2)
		try {
			validateStdDiscoveredApplicationResourceOutput(null)
		} catch (e) {
			expect(e).toBeInstanceOf(ConnectorError)
			expect((e as ConnectorError).type).toBe(ConnectorErrorType.Generic)
		}
	})

	it('rejects a non-string uuid and a blank link source id', () => {
		const output = buildStdDiscoveredApplicationResourceOutput(validInput())

		expect(() => validateStdDiscoveredApplicationResourceOutput({ ...output, uuid: 1 })).toThrow(
			'uuid must be a string'
		)
		expect(() =>
			validateStdDiscoveredApplicationResourceOutput({
				...output,
				resourceLinks: [{ ...output.resourceLinks[0], from: { id: ' ', resourceType: 'application' } }],
			})
		).toThrow('resourceLinks[0].from.id must be a non-empty string')
		expect(() =>
			validateStdDiscoveredApplicationResourceOutput({
				...output,
				resourceLinks: [{ ...output.resourceLinks[0], to: { id: undefined, resourceType: 'account' } }],
			})
		).toThrow('resourceLinks[0].to.id must be a string')
	})

	it('does not mutate the builder input and keeps connector-specific attributes', () => {
		const input = validInput()
		input.attributes.customerSpecific = 'kept'
		const snapshot = JSON.parse(JSON.stringify(input))

		const output = buildStdDiscoveredApplicationResourceOutput(input)

		expect(input).toEqual(snapshot)
		expect(input.attributes).not.toHaveProperty('discovered')
		expect(output.attributes.customerSpecific).toBe('kept')
		expect(output.attributes).not.toBe(input.attributes)
	})

	it('is exported from the public commands entry point', () => {
		expect(publicApi.buildStdDiscoveredApplicationResourceOutput).toBe(buildStdDiscoveredApplicationResourceOutput)
		expect(publicApi.validateStdDiscoveredApplicationResourceOutput).toBe(
			validateStdDiscoveredApplicationResourceOutput
		)
		expect(publicApi.STD_APPLICATION_RESOURCE_TYPE).toBe('std:application')
		expect(publicApi.isDiscoveredApplicationResource).toBe(isDiscoveredApplicationResource)
		expect(publicApi.tryBuildStdDiscoveredApplicationResourceOutput).toBe(
			tryBuildStdDiscoveredApplicationResourceOutput
		)
		expect(publicApi.STD_DISCOVERED_APPLICATION_ATTRIBUTE_NAMES).toBe(STD_DISCOVERED_APPLICATION_ATTRIBUTE_NAMES)
	})

	it('enforces required attributes and the discriminator at compile time', () => {
		const attributes = validInput().attributes
		const { applicationName: _applicationName, ...withoutName } = attributes

		// @ts-expect-error applicationName is required by the builder input type
		const missingName: StdDiscoveredApplicationResourceBuilderInput['attributes'] = withoutName
		// @ts-expect-error resourceType is set by the builder and not accepted as input
		const withType: StdDiscoveredApplicationResourceBuilderInput = { ...validInput(), resourceType: 'std:account' }

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
		const output = buildStdDiscoveredApplicationResourceOutput(validInput())

		expect(() => validateStdDiscoveredApplicationResourceOutput({ ...output, resourceLinks })).toThrow(
			expectedMessage
		)
	})

	describe('review follow-ups', () => {
		it('does not share the resourceLinks array with the caller', () => {
			const input = validInput()
			const output = buildStdDiscoveredApplicationResourceOutput(input)

			expect(output.resourceLinks).not.toBe(input.resourceLinks)
			output.resourceLinks.push({ ...output.resourceLinks[0] })
			expect(input.resourceLinks).toHaveLength(1)
		})

		it.each([
			['NaN', NaN],
			['Infinity', Infinity],
			['-Infinity', -Infinity],
		])('rejects %s numeric attributes', (_label, value) => {
			const input = validInput()
			input.attributes.riskScore = value

			expect(() => buildStdDiscoveredApplicationResourceOutput(input)).toThrow(
				'attributes.riskScore must be a finite number'
			)
		})

		it('rejects a link whose from.id is not the resource identity', () => {
			const output = buildStdDiscoveredApplicationResourceOutput(validInput())
			const resourceLinks = [
				{ ...output.resourceLinks[0], from: { id: 'app-2', resourceType: STD_APPLICATION_RESOURCE_TYPE } },
			]

			expect(() => validateStdDiscoveredApplicationResourceOutput({ ...output, resourceLinks })).toThrow(
				'resourceLinks[0].from.id must equal the resource identity'
			)
		})

		it.each([
			['deleted', 'false'],
			['disabled', 1],
		])('rejects a non-boolean %s flag', (flag, value) => {
			const output = buildStdDiscoveredApplicationResourceOutput(validInput())

			expect(() => validateStdDiscoveredApplicationResourceOutput({ ...output, [flag]: value })).toThrow(
				`${flag} must be a boolean`
			)
		})

		it('accepts boolean deleted and disabled flags', () => {
			const input = { ...validInput(), deleted: false, disabled: true }

			expect(buildStdDiscoveredApplicationResourceOutput(input)).toMatchObject({ deleted: false, disabled: true })
		})

		it('rejects the account-only top-level classification and does not type it on input', () => {
			const output = buildStdDiscoveredApplicationResourceOutput(validInput())

			expect(() =>
				validateStdDiscoveredApplicationResourceOutput({ ...output, classification: 'human' })
			).toThrow('classification is not supported for discovered applications')
			const withClassification: StdDiscoveredApplicationResourceBuilderInput = {
				...validInput(),
				// @ts-expect-error classification is not accepted on discovered application input
				classification: 'human',
			}
			expect(withClassification).toBeDefined()
		})

		it('covers every canonical attribute name used by the validator', () => {
			expect(STD_DISCOVERED_APPLICATION_ATTRIBUTE_NAMES).toEqual(
				expect.arrayContaining([
					'applicationName',
					'primaryAppName',
					'description',
					'discovered',
					'appUrl',
					'applicationOwner',
					'riskLevel',
					'groups',
				])
			)
		})

		describe('look-alike attribute warnings', () => {
			let warn: jest.SpyInstance

			beforeEach(() => {
				warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined)
			})

			afterEach(() => {
				warn.mockRestore()
			})

			it.each([
				['appURL', 'appUrl'],
				['applicationOwners', 'applicationOwner'],
				['Risk_Score', 'riskScore'],
			])('warns once that %s looks like %s but still accepts it', (name, canonical) => {
				const input = validInput()
				input.attributes[name] = 'value'

				expect(buildStdDiscoveredApplicationResourceOutput(input).attributes[name]).toBe('value')
				buildStdDiscoveredApplicationResourceOutput(input)

				expect(warn).toHaveBeenCalledTimes(1)
				expect(warn.mock.calls[0][0]).toMatchObject({ attribute: name, canonical })
			})

			it('does not warn for canonical or unrelated connector-specific attributes', () => {
				const input = validInput()
				input.attributes.appUrl = 'https://github.com'
				input.attributes.customerSpecific = 'kept'
				input.attributes.sys_class_name = 'cmdb_ci_appl'

				buildStdDiscoveredApplicationResourceOutput(input)

				expect(warn).not.toHaveBeenCalled()
			})
		})

		describe('tryBuildStdDiscoveredApplicationResourceOutput', () => {
			it('returns the built resource on success', () => {
				const result = tryBuildStdDiscoveredApplicationResourceOutput(validInput())

				expect(result.success).toBe(true)
				expect(result.success && result.value).toEqual(
					buildStdDiscoveredApplicationResourceOutput(validInput())
				)
			})

			it('returns the ConnectorError instead of throwing so a record can be skipped', () => {
				const input = validInput()
				input.attributes.primaryAppName = ''

				const result = tryBuildStdDiscoveredApplicationResourceOutput(input)

				expect(result.success).toBe(false)
				expect(!result.success && result.error).toBeInstanceOf(ConnectorError)
				expect(!result.success && result.error.message).toContain(
					'attributes.primaryAppName must be a non-empty string'
				)
			})

			it('does not swallow unexpected non-validation errors', () => {
				const input = validInput()
				Object.defineProperty(input, 'attributes', {
					get() {
						throw new TypeError('boom')
					},
				})

				expect(() => tryBuildStdDiscoveredApplicationResourceOutput(input)).toThrow('boom')
			})
		})

		describe('isDiscoveredApplicationResource gate', () => {
			const discovered = () => buildStdDiscoveredApplicationResourceOutput(validInput())

			it('is true only for std:application with attributes.discovered: true', () => {
				expect(isDiscoveredApplicationResource(discovered())).toBe(true)
			})

			it.each([
				['a std:application without discovered', { resourceType: 'std:application', attributes: {} }],
				[
					'a std:application with discovered: false',
					{ resourceType: 'std:application', attributes: { discovered: false } },
				],
				[
					'a std:application with a truthy non-boolean discovered',
					{ resourceType: 'std:application', attributes: { discovered: 'true' } },
				],
				['an agent', { resourceType: 'std:agent', attributes: { discovered: true } }],
				['an account', { resourceType: 'std:account', attributes: { discovered: true } }],
				['a resource without a resourceType', { attributes: { discovered: true } }],
				['a resource without attributes', { resourceType: 'std:application' }],
				['null', null],
				['undefined', undefined],
				['an array', []],
				['a string', 'std:application'],
			])('is false for %s', (_label, value) => {
				expect(isDiscoveredApplicationResource(value)).toBe(false)
			})

			it('lets callers pass non-discovered resources through untouched', () => {
				const accounts = [{ resourceType: 'std:account', attributes: {} }, { resourceType: 'std:application' }]
				const processed = accounts.map((resource) =>
					isDiscoveredApplicationResource(resource)
						? validateStdDiscoveredApplicationResourceOutput(resource)
						: resource
				)

				expect(processed).toEqual(accounts)
				processed.forEach((resource, index) => expect(resource).toBe(accounts[index]))
			})
		})
	})
})
