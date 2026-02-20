import { describe, it, expect } from 'vitest';
import { parseDateString } from '../parsingUtils';

/**
 * Teste: parsingUtils.test.ts
 * 
 * Proposta: Validar a conversão de datas em diversos formatos para ISO String.
 * Ações: Testa strings de data padrão, datas seriais do Excel e fallbacks.
 * Execução: Frontend Vitest.
 */

describe('parsingUtils', () => {
    describe('parseDateString', () => {
        it('deve retornar string vazia para entrada vazia', () => {
            expect(parseDateString('')).toBe('');
            expect(parseDateString(null as any)).toBe('');
            expect(parseDateString(undefined as any)).toBe('');
        });

        it('deve converter data serial do Excel (número inteiro)', () => {
            // 45848 -> 2025-07-10 (aproximadamente)
            // No Excel: 45848 é 10/07/2025
            const result = parseDateString('45848');
            expect(result).toContain('2025-07-10');
        });

        it('deve converter data serial do Excel com fração (horas/minutos)', () => {
            // 45848.5 -> 10/07/2025 12:00
            const result = parseDateString('45848.5');
            expect(result).toContain('2025-07-10T12:00:00');
        });

        it('deve converter data serial do Excel com vírgula como separador decimal', () => {
            const result = parseDateString('45848,75'); // 18:00
            expect(result).toContain('2025-07-10T18:00:00');
        });

        it('deve converter formato padrão DD/MM/YYYY HH:mm', () => {
            expect(parseDateString('10/07/2025')).toBe('2025-07-10T00:00');
            expect(parseDateString('10/07/2025 14:30')).toBe('2025-07-10T14:30');
        });

        it('deve lidar com dias e meses de um dígito', () => {
            expect(parseDateString('1/5/2023')).toBe('2023-05-01T00:00');
        });

        it('deve retornar string vazia para datas inválidas ou fora de alcance', () => {
            expect(parseDateString('32/01/2023')).toBe('');
            expect(parseDateString('01/13/2023')).toBe('');
            expect(parseDateString('texto_invalido')).toBe('');
        });

        it('deve usar o construtor nativo como fallback para formatos ISO', () => {
            const iso = '2023-12-25T10:00:00.000Z';
            expect(parseDateString(iso)).toBe(iso);
        });

        it('deve limpar espaços em branco nas extremidades', () => {
            expect(parseDateString('  10/07/2025  ')).toBe('2025-07-10T00:00');
        });
    });
});
