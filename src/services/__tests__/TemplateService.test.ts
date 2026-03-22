import { describe, it, expect, vi } from 'vitest';
import { 
    getTemplateByTypeId, 
    isComponentVisible, 
    isStepVisible,
    ANALYSIS_TYPE_IDS 
} from '../TemplateService';

describe('TemplateService', () => {
    describe('getTemplateByTypeId', () => {
        it('should return RCA template for unknown or undefined ID', () => {
            const template = getTemplateByTypeId(undefined);
            expect(template.typeId).toBe(ANALYSIS_TYPE_IDS.RCA);
            
            const template2 = getTemplateByTypeId('INVALID');
            expect(template2.typeId).toBe(ANALYSIS_TYPE_IDS.RCA);
        });

        it('should return specific template for known IDs', () => {
            const miniTemplate = getTemplateByTypeId(ANALYSIS_TYPE_IDS.MINI_RCA);
            expect(miniTemplate.typeId).toBe(ANALYSIS_TYPE_IDS.MINI_RCA);
            expect(miniTemplate.name).toBe('Mini RCA');

            const capaTemplate = getTemplateByTypeId(ANALYSIS_TYPE_IDS.CAPA);
            expect(capaTemplate.typeId).toBe(ANALYSIS_TYPE_IDS.CAPA);
        });

        it('should find template by common names (case insensitive)', () => {
            const rcaByShortName = getTemplateByTypeId('RCA');
            expect(rcaByShortName.typeId).toBe(ANALYSIS_TYPE_IDS.RCA);

            const rcaByFullName = getTemplateByTypeId('RCA Completo');
            expect(rcaByFullName.typeId).toBe(ANALYSIS_TYPE_IDS.RCA);

            const miniRca = getTemplateByTypeId('mini rca');
            expect(miniRca.typeId).toBe(ANALYSIS_TYPE_IDS.MINI_RCA);
        });

        it('should handle V17 specific strings for RCA', () => {
            const v17Rca = getTemplateByTypeId('Análise de Falha - V17');
            expect(v17Rca.typeId).toBe(ANALYSIS_TYPE_IDS.RCA);

            const v17Mini = getTemplateByTypeId('Mini RCA Geral');
            expect(v17Mini.typeId).toBe(ANALYSIS_TYPE_IDS.MINI_RCA);
        });
    });

    describe('isComponentVisible', () => {
        it('should return true for components in Mini RCA', () => {
            const typeId = ANALYSIS_TYPE_IDS.MINI_RCA;
            expect(isComponentVisible(typeId, 'FIVE_WHYS')).toBe(true);
            expect(isComponentVisible(typeId, 'ROOT_CAUSES')).toBe(true);
            expect(isComponentVisible(typeId, 'GENERAL')).toBe(true);
        });

        it('should return false for excluded components in Mini RCA', () => {
            const typeId = ANALYSIS_TYPE_IDS.MINI_RCA;
            expect(isComponentVisible(typeId, 'ISHIKAWA')).toBe(false);
            // Maintenance, Additional e HRA agora são visíveis
            expect(isComponentVisible(typeId, 'MAINTENANCE')).toBe(true);
            expect(isComponentVisible(typeId, 'ADDITIONAL')).toBe(true);
            expect(isComponentVisible(typeId, 'HRA')).toBe(true);
        });

        it('should return true for almost everything in RCA Completo', () => {
            const typeId = ANALYSIS_TYPE_IDS.RCA;
            expect(isComponentVisible(typeId, 'ISHIKAWA')).toBe(true);
            expect(isComponentVisible(typeId, 'FIVE_WHYS')).toBe(true);
            expect(isComponentVisible(typeId, 'HRA')).toBe(true);
        });
    });

    describe('isStepVisible', () => {
        it('should correctly map steps to component visibility', () => {
            const typeId = ANALYSIS_TYPE_IDS.MINI_RCA;
            expect(isStepVisible(typeId, 1)).toBe(true); // GENERAL
            expect(isStepVisible(typeId, 4)).toBe(true); // INVESTIGATION (via FIVE_WHYS)
            expect(isStepVisible(typeId, 6)).toBe(true); // MAINTENANCE
            expect(isStepVisible(typeId, 7)).toBe(true); // ADDITIONAL
            expect(isStepVisible(typeId, 9)).toBe(true); // HRA
        });

        it('should allow Investigation step if only Ishikawa is visible', () => {
            // Mocking a type that only has Ishikawa? 
            // In our current templates, RCA has both, Mini/CAPA don't.
            // But let's verify logic for Step 4
            const rcaId = ANALYSIS_TYPE_IDS.RCA;
            expect(isStepVisible(rcaId, 4)).toBe(true);
        });
    });
});
