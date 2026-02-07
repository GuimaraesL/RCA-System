
import { describe, it, expect } from 'vitest';
import { getFarol, calculateDuration, getStatusColor, getAssetName, findAssetPath } from '../triggerHelpers';
import { TaxonomyConfig, AssetNode } from '../../types';

describe('triggerHelpers', () => {
    const mockAssets: AssetNode[] = [
        {
            id: 'A1', name: 'Area 1', type: 'AREA', children: [
                {
                    id: 'E1', name: 'Equip 1', type: 'EQUIPMENT', children: [
                        { id: 'S1', name: 'Sub 1', type: 'SUBGROUP' }
                    ]
                }
            ]
        }
    ];

    describe('getAssetName', () => {
        it('should return empty string if no ID provided', () => {
            expect(getAssetName('', mockAssets)).toBe('');
        });

        it('should return the ID if no assets list provided', () => {
            expect(getAssetName('A1', [])).toBe('A1');
        });

        it('should return the correct name for a top level area', () => {
            expect(getAssetName('A1', mockAssets)).toBe('Area 1');
        });

        it('should return the correct name for a nested equipment', () => {
            expect(getAssetName('E1', mockAssets)).toBe('Equip 1');
        });

        it('should return the correct name for a deeply nested subgroup', () => {
            expect(getAssetName('S1', mockAssets)).toBe('Sub 1');
        });

        it('should return the ID if asset not found', () => {
            expect(getAssetName('UNKNOWN', mockAssets)).toBe('UNKNOWN');
        });
    });

    describe('findAssetPath', () => {
        it('should return the path to a deeply nested node', () => {
            const path = findAssetPath(mockAssets, 'S1');
            expect(path).toBeDefined();
            expect(path?.length).toBe(3);
            expect(path?.[0].id).toBe('A1');
            expect(path?.[1].id).toBe('E1');
            expect(path?.[2].id).toBe('S1');
        });

        it('should return null if node not found', () => {
            expect(findAssetPath(mockAssets, 'UNKNOWN')).toBeNull();
        });
    });

    describe('calculateDuration', () => {
        it('should calculate duration in minutes correctly', () => {
            const start = '2023-01-01T10:00:00';
            const end = '2023-01-01T11:30:00';
            expect(calculateDuration(start, end)).toBe(90);
        });

        it('should return 0 for invalid dates', () => {
            expect(calculateDuration('', '')).toBe(0);
        });
    });

    describe('getStatusColor', () => {
        const mockTaxonomy: TaxonomyConfig = {
            triggerStatuses: [
                { id: 'STATUS-01', name: 'Não iniciada' },
                { id: 'STATUS-02', name: 'Em andamento' },
                { id: 'STATUS-03', name: 'Concluída' }
            ],
            analysisTypes: [],
            analysisStatuses: [],
            specialties: [],
            failureModes: [],
            failureCategories: [],
            componentTypes: [],
            rootCauseMs: []
        };

        it('should return blue for IN_PROGRESS', () => {
            expect(getStatusColor('STATUS-01', mockTaxonomy)).toContain('bg-blue-100');
        });

        it('should return purple for WAITING_VERIFICATION and legacy STATUS-02', () => {
            expect(getStatusColor('STATUS-02', mockTaxonomy)).toContain('bg-purple-100');
            expect(getStatusColor('STATUS-WAITING', mockTaxonomy)).toContain('bg-purple-100');
        });

        it('should return green for CONCLUDED', () => {
            expect(getStatusColor('STATUS-03', mockTaxonomy)).toContain('bg-green-100');
        });

        it('should return gray for unknown status', () => {
            expect(getStatusColor('UNKNOWN', mockTaxonomy)).toContain('bg-gray-50');
        });
    });

    describe('getFarol', () => {
        const mockTaxonomy: TaxonomyConfig = {
            triggerStatuses: [
                { id: 'STATUS-01', name: 'Não iniciada' },
                { id: 'STATUS-03', name: 'Concluída' }
            ],
            analysisTypes: [],
            analysisStatuses: [],
            specialties: [],
            failureModes: [],
            failureCategories: [],
            componentTypes: [],
            rootCauseMs: []
        };

        it('should return check for concluded status', () => {
            const result = getFarol('2023-01-01', 'STATUS-03', mockTaxonomy);
            expect(result.days).toBe('CHECK');
            expect(result.color).toContain('bg-green-100');
            expect(result.color).toContain('border-green-200');
        });

        it('should return red for old open triggers (>7 days)', () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 10);
            const result = getFarol(oldDate.toISOString(), 'STATUS-01', mockTaxonomy);
            expect(result.color).toContain('bg-red-100');
            expect(result.days).toBeGreaterThanOrEqual(9);
        });

        it('should return yellow for medium open triggers (3-7 days)', () => {
            const medDate = new Date();
            medDate.setDate(medDate.getDate() - 4);
            const result = getFarol(medDate.toISOString(), '1', mockTaxonomy);
            expect(result.color).toContain('bg-yellow-100');
            expect(result.days).toBeGreaterThanOrEqual(3);
        });

        it('should return green for new open triggers (<3 days)', () => {
            const newDate = new Date();
            // less than 3 days
            newDate.setDate(newDate.getDate() - 1);
            const result = getFarol(newDate.toISOString(), '1', mockTaxonomy);
            expect(result.color).toContain('bg-green-100');
            expect(result.days).toBeLessThan(3);
        });
    });
});
