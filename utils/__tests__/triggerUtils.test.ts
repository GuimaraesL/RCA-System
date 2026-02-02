
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
                { id: '1', name: 'Não iniciada' },
                { id: '2', name: 'Em andamento' },
                { id: '3', name: 'Concluída' }
            ],
            analysisTypes: [],
            failureModes: [],
            failureCategories: [],
            componentTypes: [],
            rootCause6M: []
        };

        it('should return gray for "Não iniciada"', () => {
            expect(getStatusColor('1', mockTaxonomy)).toContain('bg-gray-100');
        });

        it('should return blue for "Em andamento"', () => {
            expect(getStatusColor('2', mockTaxonomy)).toContain('bg-blue-100');
        });

        it('should return green for "Concluída"', () => {
            expect(getStatusColor('3', mockTaxonomy)).toContain('bg-green-100');
        });
    });

    describe('getFarol', () => {
        const mockTaxonomy: TaxonomyConfig = {
            triggerStatuses: [
                { id: '1', name: 'Não iniciada' },
                { id: '3', name: 'Concluída' }
            ],
            analysisTypes: [],
            failureModes: [],
            failureCategories: [],
            componentTypes: [],
            rootCause6M: []
        };

        it('should return check for concluded status', () => {
            const result = getFarol('2023-01-01', '3', mockTaxonomy);
            expect(result.days).toBe('CHECK');
            expect(result.color).toContain('bg-green-100');
            expect(result.color).toContain('border-green-200');
        });

        it('should return red for old open triggers (>7 days)', () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 10);
            const result = getFarol(oldDate.toISOString(), '1', mockTaxonomy);
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
