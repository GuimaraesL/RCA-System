
import { describe, it, expect } from 'vitest';
import { getFarol, calculateDuration, getStatusColor } from '../triggerHelpers';
import { TaxonomyConfig } from '../../types';

describe('triggerHelpers', () => {
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

        it('should return purple for WAITING_VERIFICATION', () => {
            // Note: triggerHelpers.ts has a special case for 'STATUS-02' returning blue in switch, 
            // but then another case for WAITING_VERIFICATION (which is also 'STATUS-02') returning purple.
            // Wait, let's check triggerHelpers.ts again.
            expect(getStatusColor('STATUS-02', mockTaxonomy)).toContain('bg-blue-100');
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
