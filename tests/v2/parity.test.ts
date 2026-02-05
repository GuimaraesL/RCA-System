
import { describe, it, expect } from 'vitest';
import { calculateRcaStatus as v1Calculate, migrateRcaData as v1Migrate } from '../../server/src/services/rcaStatusService';
import { RcaService } from '../../server/src/v2/domain/services/RcaService';
import { Action, TaxonomyConfig } from '../../server/src/v2/domain/types/RcaTypes';

// Mock Taxonomy (Shared)
const mockTaxonomy: any = {
    analysisStatuses: [
        { id: 'STATUS-01', name: 'Em Andamento' },
        { id: 'STATUS-WAITING', name: 'Aguardando Verificação' },
        { id: 'STATUS-03', name: 'Concluída' }
    ],
    mandatoryFields: {
        rca: {
            create: ['what'],
            conclude: ['what', 'root_causes', 'participants']
        }
    }
};

describe('V1 vs V2 Logic Parity', () => {
    const v2Service = new RcaService(); // Mock repos not needed for calc logic (pure function part)

    const checkParity = (caseName: string, rca: any, actions: any[]) => {
        // V1
        const v1Migrated = v1Migrate({ ...rca });
        const v1Result = v1Calculate(v1Migrated, actions, mockTaxonomy);

        // V2
        const v2Migrated = v2Service.migrateRcaData({ ...rca });
        const v2Result = v2Service.calculateRcaStatus(v2Migrated, actions as Action[], mockTaxonomy);

        // Assertions
        expect(v2Result.newStatus).toBe(v1Result.newStatus);

        // Reason might differ slightly if I fixed typos, but let's log if different
        if (v2Result.reason !== v1Result.reason) {
            console.warn(`[${caseName}] Reason Diff:\n V1: ${v1Result.reason}\n V2: ${v2Result.reason}`);
        }
    };

    it('Case 1: Empty / New RCA', () => {
        checkParity('Empty', { id: '1', status: 'STATUS-01' }, []);
    });

    it('Case 2: Complete but no actions', () => {
        checkParity('Complete', {
            id: '2',
            status: 'STATUS-01',
            what: 'Valid Title',
            root_causes: [{ id: '1', cause: 'x' }],
            participants: ['User']
        }, []);
    });

    it('Case 3: Complete with Pending Action', () => {
        checkParity('Pending Action', {
            id: '3',
            status: 'STATUS-01',
            what: 'Valid Title',
            root_causes: [{ id: '1', cause: 'x' }],
            participants: ['User']
        }, [{ rca_id: '3', status: '1' }]);
    });

    it('Case 4: Complete with Effective Action', () => {
        checkParity('Effective Action', {
            id: '4',
            status: 'STATUS-WAITING',
            what: 'Valid Title',
            root_causes: [{ id: '1', cause: 'x' }],
            participants: ['User']
        }, [{ rca_id: '4', status: '3' }]);
    });

    it('Case 5: Missing Mandatory Data', () => {
        checkParity('Missing Mandatory', {
            id: '5',
            status: 'STATUS-03',
            what: 'Valid Title',
            participants: []
        }, []);
    });
});
