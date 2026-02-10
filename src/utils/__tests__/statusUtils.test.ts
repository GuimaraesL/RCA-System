
import { describe, it, expect, vi } from 'vitest';
import { translateStatus, translate6M } from '../statusUtils';
import { STATUS_IDS, ROOT_CAUSE_M_IDS } from '../../constants/SystemConstants';

describe('statusUtils', () => {
    const t = (key: string) => key; // Mock t returns the key

    describe('translateStatus', () => {
        it('should return translated value for standard names', () => {
            const result = translateStatus(STATUS_IDS.IN_PROGRESS, 'Em Andamento', t);
            expect(result).toBe('status.inProgress');
        });

        it('should return fallback name for custom names (overrides)', () => {
            const result = translateStatus(STATUS_IDS.IN_PROGRESS, 'Custom Status Name', t);
            expect(result).toBe('Custom Status Name');
        });

        it('should handle legacy STATUS-DONE ID', () => {
            const result = translateStatus('STATUS-DONE', 'Concluída', t);
            expect(result).toBe('status.completed');
        });
    });

    describe('translate6M', () => {
        it('should return translated value for standard 6M names', () => {
            const result = translate6M(ROOT_CAUSE_M_IDS.MACHINE, 'Máquina', t);
            expect(result).toBe('rootCauseMs.machine');
        });

        it('should return fallback name for custom 6M names', () => {
            const result = translate6M(ROOT_CAUSE_M_IDS.MACHINE, 'Equipamento (Custom)', t);
            expect(result).toBe('Equipamento (Custom)');
        });
    });
});
