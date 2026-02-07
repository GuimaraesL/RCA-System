import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RcaController } from '../RcaController';
import { Request, Response } from 'express';

// Mocks - Using vi.hoisted to avoid ReferenceError
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
                getAllRcas: mocks.mockGetAllRcas
            };
        })
    };
});

vi.mock('../../../infrastructure/repositories/SqlRcaRepository', () => {
    return {
        SqlRcaRepository: vi.fn().mockImplementation(function () {
            return {
                findAll: mocks.mockFindAll,
                findAllSummary: mocks.mockFindAll, // Re-use same mock
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
            // Add methods if needed by controller, currently RcaController might not distinctively use it 
            // except passed to RcaService. RcaService mock handles the logic.
            // But strict constructor might require it.
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
        // Clear mocks metadata (calls) but keep implementations if possible
        vi.clearAllMocks();

        // Reset default behaviors
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
        mocks.mockFindById.mockReset(); // Clear specific findById behavior for each test

        controller = new RcaController();
        jsonMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({ json: jsonMock });
        mockRes = {
            json: jsonMock,
            status: statusMock,
            // Add other required mock methods if needed
        } as unknown as Response;
    });

    it('should return 400 for invalid create data (invalid type)', async () => {
        // 'participants' must be array/object/null/string(json). number is invalid.
        // If Zod schema allows number for some reason, we need to find another field.
        // 'what' is simple string/nullish.
        // Let's try sending a guaranteed invalid payload for Zod object.
        // Wait, req.body IS the object.

        // rcaSchema is z.object().
        // If we send "string" as body, it should fail.
        mockReq = { body: "invalid-string-body" };

        await controller.create(mockReq as unknown as any, mockRes as unknown as any);

        // Check calls
        if (statusMock.mock.calls.length > 0) {
            console.log('Status called with:', statusMock.mock.calls[0][0]);
        } else {
            console.log('Status NOT called');
        }

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid Data' }));
    });

    it('should return 201 for valid create data', async () => {
        mockReq = { body: { what: 'Valid RCA' } };

        await controller.create(mockReq as unknown as any, mockRes as unknown as any);

        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'test-id' }));
    });

    describe('getById', () => {
        it('should return 200 and the record if found', async () => {
            mocks.mockFindById.mockReturnValue({ id: 'R1' });

            mockReq = { params: { id: 'R1' } };
            await controller.getById(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'R1' }));
        });

        it('should return 404 if record not found', async () => {
            mocks.mockFindById.mockReturnValue(null);

            mockReq = { params: { id: 'NOT-FOUND' } };
            await controller.getById(mockReq as any, mockRes as any);
            expect(statusMock).toHaveBeenCalledWith(404);
        });
    });

    describe('update', () => {
        it('should return 200 for valid update', async () => {
            mockReq = { params: { id: 'R1' }, body: { what: 'Updated' } };
            await controller.update(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('updated') }));
        });

        it('should return 400 for invalid update data', async () => {
            mockReq = { params: { id: 'R1' }, body: "invalid" };
            await controller.update(mockReq as any, mockRes as any);
            expect(statusMock).toHaveBeenCalledWith(400);
        });
    });

    describe('delete', () => {
        it('should return 200 after successful deletion', async () => {
            mockReq = { params: { id: 'R1' } };
            await controller.delete(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('deleted') }));
        });
    });

    describe('getAll', () => {
        it('should return all records in summary mode (no limit)', async () => {
            mockReq = { query: {} };
            await controller.getAll(mockReq as any, mockRes as any);
            // Verify call (if we spy on it, but here we just check result which comes from same mock)
            expect(jsonMock).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'rca-legacy' })]));
        });

        it('should return paginated records when limit is provided', async () => {
            mockReq = { query: { page: '1', limit: '10' } };
            await controller.getAll(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.any(Array),
                meta: expect.objectContaining({ total: 1 })
            }));
        });
    });

    describe('bulk operations', () => {
        it('should return 200 for valid bulk import', async () => {
            mockReq = { body: [{ id: 'R1', what: 'Bulk 1' }] };
            await controller.bulkImport(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Imported') }));
        });

        it('should return 400 for invalid bulk import (not an array)', async () => {
            mockReq = { body: { not: 'an-array' } };
            await controller.bulkImport(mockReq as any, mockRes as any);
            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('should return 200 for valid bulk delete', async () => {
            mockReq = { body: { ids: ['R1', 'R2'] } };
            await controller.bulkDelete(mockReq as any, mockRes as any);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Deleted') }));
        });

        it('should return 400 for invalid bulk delete (missing ids)', async () => {
            mockReq = { body: {} };
            await controller.bulkDelete(mockReq as any, mockRes as any);
            expect(statusMock).toHaveBeenCalledWith(400);
        });
    });
});
