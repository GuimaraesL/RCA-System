/**
 * Teste: RcaController.test.ts
 * 
 * Proposta: Validar a camada de controladores da API de RCA, garantindo respostas corretas para requisições HTTP.
 * Ações: Simulação de requisições Express, mocking de serviços e validação de códigos de status e payloads JSON.
 * Execução: Backend Vitest.
 * Fluxo: Definição de mocks globais -> Configuração de objetos de request/response -> Chamada de métodos do controlador -> Asserção de resultados.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RcaController } from '../RcaController';
import { Request, Response } from 'express';

// Mocks - Usando vi.hoisted para evitar ReferenceError durante o hoisting do Vitest
const mocks = vi.hoisted(() => {
    return {
        mockCreateRca: vi.fn().mockReturnValue({
            rca: { id: 'test-id', status: 'STATUS-01' },
            statusReason: 'reason'
        }),
        mockUpdateRca: vi.fn().mockReturnValue({
            rca: { id: 'test-id', status: 'STATUS-03' },
            statusChanged: true,
            statusReason: 'Complete'
        }),
        mockGetAllRcas: vi.fn().mockReturnValue({
            data: [{ id: 'rca-1' }],
            total: 1
        }),
        mockBulkImport: vi.fn().mockReturnValue({ count: 1 }),
        mockFindAll: vi.fn().mockReturnValue([{ id: 'rca-legacy' }]),
        mockFindById: vi.fn(),
        mockBulkCreate: vi.fn(),
        mockBulkDelete: vi.fn(),
        mockDelete: vi.fn(),
        mockGetTaxonomy: vi.fn().mockReturnValue({})
    };
});

vi.mock('../../../domain/services/RcaService', () => {
    return {
        RcaService: vi.fn().mockImplementation(function () {
            return {
                createRca: mocks.mockCreateRca,
                updateRca: mocks.mockUpdateRca,
                getAllRcas: mocks.mockGetAllRcas,
                bulkImport: mocks.mockBulkImport
            };
        })
    };
});

vi.mock('../../../infrastructure/repositories/SqlRcaRepository', () => {
    return {
        SqlRcaRepository: vi.fn().mockImplementation(function () {
            return {
                findAll: mocks.mockFindAll,
                findAllSummary: mocks.mockFindAll, // Reutiliza o mesmo mock
                findById: mocks.mockFindById,
                bulkCreate: mocks.mockBulkCreate,
                bulkDelete: mocks.mockBulkDelete,
                delete: mocks.mockDelete
            };
        })
    };
});

vi.mock('../../../infrastructure/repositories/SqlTaxonomyRepository', () => {
    return {
        SqlTaxonomyRepository: vi.fn().mockImplementation(function () {
            return {
                getTaxonomy: mocks.mockGetTaxonomy
            };
        })
    };
});

vi.mock('../../../infrastructure/repositories/SqlActionRepository', () => {
    return {
        SqlActionRepository: vi.fn().mockImplementation(() => ({
            // Métodos adicionados conforme necessário pelo construtor do controlador
        }))
    };
});

describe('RcaController Integration', () => {
    let controller: RcaController;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let jsonMock: any;
    let statusMock: any;

    beforeEach(() => {
        // Limpa metadados dos mocks (chamadas) mas mantém implementações
        vi.clearAllMocks();

        // Reseta comportamentos padrão
        mocks.mockFindAll.mockReturnValue([{ id: 'rca-legacy' }]);
        mocks.mockGetAllRcas.mockReturnValue({
            data: [{ id: 'rca-1' }],
            total: 1
        });
        mocks.mockCreateRca.mockReturnValue({
            rca: { id: 'test-id', status: 'STATUS-01' },
            statusReason: 'reason'
        });
        mocks.mockUpdateRca.mockReturnValue({
            rca: { id: 'test-id', status: 'STATUS-03' },
            statusChanged: true,
            statusReason: 'Complete'
        });
        mocks.mockFindById.mockReset(); 

        controller = new RcaController();
        jsonMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({ json: jsonMock });
        mockRes = {
            json: jsonMock,
            status: statusMock,
        } as unknown as Response;
    });

    it('deve retornar 400 para dados de criação inválidos (tipo inválido)', async () => {
        // Simula um corpo de requisição inválido para o schema Zod
        mockReq = { body: "invalid-string-body" };

        await controller.create(mockReq as unknown as any, mockRes as unknown as any);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Dados inválidos/i) }));
    });

    it('deve retornar 201 para dados de criação válidos', async () => {
        mockReq = { body: { what: 'Valid RCA' } };

        await controller.create(mockReq as unknown as any, mockRes as unknown as any);

        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'test-id' }));
    });

    describe('getById', () => {
        it('deve retornar 200 e o registro se encontrado', async () => {
            mocks.mockFindById.mockReturnValue({ id: 'R1' });

            mockReq = { params: { id: 'R1' } };
            await controller.getById(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'R1' }));
        });

        it('deve retornar 404 se o registro não for encontrado', async () => {
            mocks.mockFindById.mockReturnValue(null);

            mockReq = { params: { id: 'NOT-FOUND' } };
            await controller.getById(mockReq as any, mockRes as any);
            expect(statusMock).toHaveBeenCalledWith(404);
        });
    });

    describe('update', () => {
        it('deve retornar 200 para atualização válida', async () => {
            mockReq = { params: { id: 'R1' }, body: { what: 'Updated' } };
            await controller.update(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/atualizada/i) }));
        });

        it('deve retornar 400 para dados de atualização inválidos', async () => {
            mockReq = { params: { id: 'R1' }, body: "invalid" };
            await controller.update(mockReq as any, mockRes as any);
            expect(statusMock).toHaveBeenCalledWith(400);
        });
    });

    describe('delete', () => {
        it('deve retornar 200 após exclusão bem-sucedida', async () => {
            mockReq = { params: { id: 'R1' } };
            await controller.delete(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/excluída/i) }));
        });
    });

    describe('getAll', () => {
        it('deve retornar todos os registros no modo resumo (sem limite)', async () => {
            mockReq = { query: {} };
            await controller.getAll(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'rca-legacy' })]));
        });

        it('deve retornar registros paginados quando o limite é fornecido', async () => {
            mockReq = { query: { page: '1', limit: '10' } };
            await controller.getAll(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.any(Array),
                meta: expect.objectContaining({ total: 1 })
            }));
        });
    });

    describe('operações em massa (bulk)', () => {
        it('deve retornar 200 para importação em massa válida', async () => {
            mockReq = { body: [{ id: 'R1', what: 'Bulk 1' }] };
            await controller.bulkImport(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/Importação/i) }));
        });

        it('deve retornar 400 para importação em massa inválida (não é um array)', async () => {
            mockReq = { body: { not: 'an-array' } };
            await controller.bulkImport(mockReq as any, mockRes as any);
            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('deve retornar 200 para exclusão em massa válida', async () => {
            mockReq = { body: { ids: ['R1', 'R2'] } };
            await controller.bulkDelete(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/excluídas/i) }));
        });

        it('deve retornar 400 para exclusão em massa inválida (IDs ausentes)', async () => {
            mockReq = { body: {} };
            await controller.bulkDelete(mockReq as any, mockRes as any);
            expect(statusMock).toHaveBeenCalledWith(400);
        });
    });
});
