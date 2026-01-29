/* Copyright (c) 2024. SailPoint Technologies, Inc. All rights reserved. */

import { StdApplicationDiscoveryOutputList, StdApplicationDiscoveryListOutput, RiskLevel } from './std-application-discovery-list';

describe('StdApplicationDiscoveryList Types', () => {
	describe('RiskLevel type enforcement', () => {
		it('should accept valid RiskLevel values: High', () => {
			const app: StdApplicationDiscoveryOutputList = {
				id: 'test-id',
				primaryAppName: 'Test App',
				description: 'Test description',
				riskLevel: 'High' as RiskLevel
			};
			expect(app.riskLevel).toBe('High');
		});

		it('should accept valid RiskLevel values: Medium', () => {
			const app: StdApplicationDiscoveryOutputList = {
				id: 'test-id',
				primaryAppName: 'Test App',
				description: 'Test description',
				riskLevel: 'Medium' as RiskLevel
			};
			expect(app.riskLevel).toBe('Medium');
		});

		it('should accept valid RiskLevel values: Low', () => {
			const app: StdApplicationDiscoveryOutputList = {
				id: 'test-id',
				primaryAppName: 'Test App',
				description: 'Test description',
				riskLevel: 'Low' as RiskLevel
			};
			expect(app.riskLevel).toBe('Low');
		});

		it('should accept undefined for riskLevel', () => {
			const app: StdApplicationDiscoveryOutputList = {
				id: 'test-id',
				primaryAppName: 'Test App',
				description: 'Test description',
				riskLevel: undefined
			};
			expect(app.riskLevel).toBeUndefined();
		});

		it('should work with StdApplicationDiscoveryListOutput type', () => {
			const app: StdApplicationDiscoveryListOutput = {
				id: 'test-id',
				primaryAppName: 'Test App',
				description: 'Test description',
				riskLevel: 'High' as RiskLevel
			};
			expect(app.riskLevel).toBe('High');
		});

		it('should allow all valid RiskLevel values in an array', () => {
			const validLevels: RiskLevel[] = ['High', 'Medium', 'Low'];
			expect(validLevels).toHaveLength(3);
			expect(validLevels).toContain('High');
			expect(validLevels).toContain('Medium');
			expect(validLevels).toContain('Low');
		});

		it('should export RiskLevel type', () => {
			// This test ensures the type is exported and can be used
			const level: RiskLevel = 'High';
			expect(typeof level).toBe('string');
			expect(level).toBe('High');
		});
	});

	describe('Type safety validation', () => {
		it('should enforce RiskLevel type in application objects', () => {
			// Valid usage - should compile without errors
			const validApp: StdApplicationDiscoveryOutputList = {
				id: 'app-1',
				primaryAppName: 'App 1',
				description: 'Description',
				riskLevel: 'High' as RiskLevel,
				riskScore: 10
			};

			expect(validApp.riskLevel).toBe('High');
			expect(validApp.riskScore).toBe(10);
		});

		it('should allow riskLevel to be optional', () => {
			const appWithoutRiskLevel: StdApplicationDiscoveryOutputList = {
				id: 'app-2',
				primaryAppName: 'App 2',
				description: 'Description'
			};

			expect(appWithoutRiskLevel.riskLevel).toBeUndefined();
		});

		it('should work with all application discovery fields', () => {
			const completeApp: StdApplicationDiscoveryOutputList = {
				id: 'app-3',
				primaryAppName: 'App 3',
				description: 'Description',
				riskLevel: 'Medium' as RiskLevel,
				riskScore: 5,
				isBusiness: true,
				totalSigninsCount: 100,
				connectorCategory: 'browser_extension',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			expect(completeApp.riskLevel).toBe('Medium');
			expect(completeApp.riskScore).toBe(5);
			expect(completeApp.isBusiness).toBe(true);
		});
	});
});
