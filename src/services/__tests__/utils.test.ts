
import { describe, it, expect } from 'vitest';
import { filterAssetsByUsage, generateId, sanitizeString } from '../utils';
import { AssetNode } from '../../types';

describe('Service Utils', () => {
    describe('generateId', () => {
        it('should generate an ID with the specified prefix', () => {
            const id = generateId('TEST');
            expect(id.startsWith('TEST-')).toBe(true);
        });

        it('should generate unique IDs', () => {
            const id1 = generateId('TEST');
            const id2 = generateId('TEST');
            expect(id1).not.toBe(id2);
        });
    });

    describe('sanitizeString', () => {
        it('should strip HTML tags', () => {
            const input = '<script>alert("XSS")</script>Hello <b>World</b>';
            const output = sanitizeString(input);
            expect(output).toBe('alert("XSS")Hello World');
        });

        it('should return empty string for non-string input', () => {
            expect(sanitizeString(null)).toBe('');
            expect(sanitizeString(undefined)).toBe('');
            expect(sanitizeString(123)).toBe('');
        });
    });

    describe('filterAssetsByUsage', () => {
        const assets: AssetNode[] = [
            {
                id: 'A1', name: 'Area 1', type: 'AREA', children: [
                    {
                        id: 'E1', name: 'Equip 1', type: 'EQUIPMENT', children: [
                            { id: 'S1', name: 'Sub 1', type: 'SUBGROUP' },
                            { id: 'S2', name: 'Sub 2', type: 'SUBGROUP' }
                        ]
                    },
                    {
                        id: 'E2', name: 'Equip 2', type: 'EQUIPMENT', children: [
                            { id: 'S3', name: 'Sub 3', type: 'SUBGROUP' }
                        ]
                    }
                ]
            },
            {
                id: 'A2', name: 'Area 2', type: 'AREA', children: []
            }
        ];

        it('should return empty array if no IDs match', () => {
            const usedIds = new Set(['UNKNOWN']);
            const result = filterAssetsByUsage(assets, usedIds);
            expect(result.length).toBe(0);
        });

        it('should include root area if one of its children is used', () => {
            const usedIds = new Set(['S1']);
            const result = filterAssetsByUsage(assets, usedIds);
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('A1');
            expect(result[0].children?.length).toBe(1);
            expect(result[0].children?.[0].id).toBe('E1');
            expect(result[0].children?.[0].children?.length).toBe(1);
            expect(result[0].children?.[0].children?.[0].id).toBe('S1');
        });

        it('should include multiple branches if multiple children are used', () => {
            const usedIds = new Set(['S1', 'S3']);
            const result = filterAssetsByUsage(assets, usedIds);
            expect(result.length).toBe(1);
            expect(result[0].children?.length).toBe(2);
            expect(result[0].children?.map(c => c.id)).toContain('E1');
            expect(result[0].children?.map(c => c.id)).toContain('E2');
        });

        it('should include root if root itself is used even without children used', () => {
            const usedIds = new Set(['A2']);
            const result = filterAssetsByUsage(assets, usedIds);
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('A2');
        });
    });
});
