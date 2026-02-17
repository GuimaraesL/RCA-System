/**
 * Teste: statusUtils.test.ts
 * 
 * Proposta: Validar as funções utilitárias de tradução e mapeamento de status e categorias 6M.
 * Ações: Execução de testes unitários para verificar se as IDs padrão são corretamente traduzidas para as chaves i18n correspondentes.
 * Execução: Frontend Vitest.
 * Fluxo: Chamada das funções translateStatus e translate6M com diferentes combinações de IDs e nomes customizados -> Asserção de retorno de chaves i18n ou nomes de fallback.
 */

import { describe, it, expect, vi } from 'vitest';
import { translateStatus, translate6M } from '../statusUtils';
import { STATUS_IDS, ROOT_CAUSE_M_IDS } from '../../constants/SystemConstants';

describe('statusUtils', () => {
    const t = (key: string) => key; // Mock t retorna a própria chave

    describe('translateStatus (Tradução de Status)', () => {
        it('deve retornar o valor traduzido para nomes padrão', () => {
            const result = translateStatus(STATUS_IDS.IN_PROGRESS, 'Em Andamento', t);
            expect(result).toBe('status.inProgress');
        });

        it('deve retornar o nome de fallback para nomes customizados (sobrescritas)', () => {
            const result = translateStatus(STATUS_IDS.IN_PROGRESS, 'Nome de Status Customizado', t);
            expect(result).toBe('Nome de Status Customizado');
        });

        it('deve lidar com o ID legado STATUS-DONE', () => {
            const result = translateStatus('STATUS-DONE', 'Concluída', t);
            expect(result).toBe('status.completed');
        });
    });

    describe('translate6M (Tradução de 6M)', () => {
        it('deve retornar o valor traduzido para nomes 6M padrão', () => {
            const result = translate6M(ROOT_CAUSE_M_IDS.MACHINE, 'Máquina', t);
            expect(result).toBe('rootCauseMs.machine');
        });

        it('deve retornar o nome de fallback para nomes 6M customizados', () => {
            const result = translate6M(ROOT_CAUSE_M_IDS.MACHINE, 'Equipamento (Custom)', t);
            expect(result).toBe('Equipamento (Custom)');
        });
    });
});

