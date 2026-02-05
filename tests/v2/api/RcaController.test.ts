import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RcaController } from '../../../server/src/v2/api/controllers/RcaController';
import { Request, Response } from 'express';

// Mocks
vi.mock('../../../server/src/v2/domain/services/RcaService', () => {
    return {
        RcaService: vi.fn().mockImplementation(() => ({
            createRca: vi.fn().mockReturnValue({
                rca: { id: 'test-id', status: 'STATUS-01' },
                statusReason: 'reason'
            }),
            updateRca: vi.fn()
        }))
    };
});

vi.mock('../../../server/src/v2/infrastructure/repositories/SqlRcaRepository', () => {
    return {
        SqlRcaRepository: vi.fn().mockImplementation(() => ({
            findAll: vi.fn(),
            findById: vi.fn()
        }))
    };
});

vi.mock('../../../server/src/v2/infrastructure/repositories/SqlTaxonomyRepository', () => {
    return {
        SqlTaxonomyRepository: vi.fn().mockImplementation(() => ({
            getTaxonomy: vi.fn().mockReturnValue({})
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
        // Clear mocks
        vi.clearAllMocks();

        controller = new RcaController();
        jsonMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({ json: jsonMock });
        mockRes = {
            json: jsonMock,
            status: statusMock,
            // Add other required mock methods if needed
        } as unknown as Response;
    });

    it('should return 400 for invalid create data (invalid type)', () => {
        // 'participants' must be array/object/null/string(json). number is invalid.
        // If Zod schema allows number for some reason, we need to find another field.
        // 'what' is simple string/nullish.
        // Let's try sending a guaranteed invalid payload for Zod object.
        // Wait, req.body IS the object.

        // rcaSchema is z.object().
        // If we send "string" as body, it should fail.
        mockReq = { body: "invalid-string-body" };

        controller.create(mockReq as unknown as any, mockRes as unknown as any);

        // Check calls
        if (statusMock.mock.calls.length > 0) {
            console.log('Status called with:', statusMock.mock.calls[0][0]);
        } else {
            console.log('Status NOT called');
        }

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid Data' }));
    });

    it('should return 201 for valid create data', () => {
        mockReq = { body: { what: 'Valid RCA' } };

        controller.create(mockReq as unknown as any, mockRes as unknown as any);

        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'test-id' }));
    });
});
