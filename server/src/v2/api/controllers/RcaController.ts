import { Request, Response } from 'express';
import { RcaService } from '../../domain/services/RcaService';
import { SqlRcaRepository } from '../../infrastructure/repositories/SqlRcaRepository';
import { SqlTaxonomyRepository } from '../../infrastructure/repositories/SqlTaxonomyRepository';
import { z } from 'zod';
// Importando schema de validação existente para manter compatibilidade
import { rcaSchema } from '../schemas/validation';

export class RcaController {
    private rcaService: RcaService;
    private rcaRepo: SqlRcaRepository;
    private taxonomyRepo: SqlTaxonomyRepository;

    constructor() {
        this.rcaService = new RcaService();
        this.rcaRepo = new SqlRcaRepository();
        this.taxonomyRepo = new SqlTaxonomyRepository();
    }

    // GET /api/v2/rcas
    public getAll = (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 0; // 0 = all (compatibility)

            if (limit > 0) {
                const result = this.rcaService.getAllRcas(page, limit);
                res.json({
                    data: result.data,
                    meta: {
                        page,
                        limit,
                        total: result.total,
                        totalPages: Math.ceil(result.total / limit)
                    }
                });
            } else {
                // Optimized behavior: Return summary array directly
                const rcas = this.rcaRepo.findAllSummary();
                res.json(rcas);
            }
        } catch (error) {
            console.error('[V2] Error getting all RCAs:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // GET /api/v2/rcas/:id
    public getById = (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const rca = this.rcaRepo.findById(id);
            if (!rca) {
                return res.status(404).json({ error: 'RCA not found' });
            }
            res.json(rca);
        } catch (error) {
            console.error('[V2] Error getting RCA by ID:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // POST /api/v2/rcas
    public create = (req: Request, res: Response) => {
        try {
            const parse = rcaSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({ error: 'Invalid Data', details: parse.error.format() });
            }

            const taxonomy = this.taxonomyRepo.getTaxonomy();
            const result = this.rcaService.createRca(parse.data as any, taxonomy);

            // console.log(`[V2] ✅ RCA Created: ${result.rca.id}`);
            res.status(201).json({
                // id is included in ...result.rca
                message: 'RCA created successfully',
                status: result.rca.status,
                statusReason: result.statusReason,
                ...result.rca
            });
        } catch (error) {
            console.error('[V2] Error creating RCA:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // PUT /api/v2/rcas/:id
    public update = (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const parse = rcaSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({ error: 'Invalid Data', details: parse.error.format() });
            }

            const taxonomy = this.taxonomyRepo.getTaxonomy();
            // Note: Service handles status calculation and update
            const result = this.rcaService.updateRca(id, parse.data, taxonomy);

            // console.log(`[V2] ✅ RCA Updated: ${id}`);
            res.json({
                message: 'RCA updated successfully',
                status: result.rca.status,
                statusChanged: result.statusChanged,
                statusReason: result.statusReason,
                ...result.rca // Optional: return full object if needed by frontend
            });
        } catch (error) {
            console.error('[V2] Error updating RCA:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // DELETE /api/v2/rcas/:id
    public delete = (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            this.rcaRepo.delete(id);
            // console.log(`[V2] 🗑️ RCA Deleted: ${id}`);
            res.json({ message: 'RCA deleted successfully' });
        } catch (error) {
            console.error('[V2] Error deleting RCA:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // POST /api/v2/rcas/bulk
    public bulkImport = (req: Request, res: Response) => {
        try {
            const rcasRaw = req.body;
            if (!Array.isArray(rcasRaw)) {
                return res.status(400).json({ error: 'Body must be an array' });
            }

            const parse = z.array(rcaSchema).safeParse(rcasRaw);
            if (!parse.success) {
                return res.status(400).json({ error: 'Invalid Data in Array', details: parse.error.format() });
            }

            // For bulk import, we might bypass complex service logic for performance, 
            // OR iterate. The repository supports bulkCreate.
            // Given the requirements to maintain identical logic to "V1", 
            // V1 uses "INSERT OR REPLACE" directly without service logic for EACH item (check rcas.ts L227).
            // However, V1 DOES NOT run status calculation for bulk items. It just dumps them in.
            // So we will use Repo.bulkCreate directly.

            // console.log(`[V2] 🔄 Bulk Importing ${parse.data.length} RCAs...`);
            this.rcaRepo.bulkCreate(parse.data as any[]); // types might need casting depending on exact zod vs Rca match

            // console.log(`[V2] ✅ Bulk Import Completed.`);
            res.json({ message: `Imported ${parse.data.length} RCAs successfully` });

        } catch (error) {
            console.error('[V2] Error bulk importing:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // POST /api/v2/rcas/bulk-delete
    public bulkDelete = (req: Request, res: Response) => {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids)) {
                return res.status(400).json({ error: 'Body must contain "ids" array' });
            }

            console.log(`[V2] 🗑️ Bulk Deleting ${ids.length} RCAs...`);
            this.rcaRepo.bulkDelete(ids);

            // console.log(`[V2] ✅ Bulk Delete Completed.`);
            res.json({ message: `Deleted ${ids.length} RCAs successfully` });
        } catch (error) {
            console.error('[V2] Error bulk deleting:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
