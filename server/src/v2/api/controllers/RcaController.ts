/**
 * Proposta: Controlador HTTP para gestão de Análises RCA.
 * Fluxo: Disponibiliza endpoints CRUD para manipulação de análises, orquestra operações em massa (Bulk) e integra a lógica de cálculo automático de status através do RcaService.
 */

import { Request, Response } from 'express';
import { RcaService } from '../../domain/services/RcaService';
import { SqlRcaRepository } from '../../infrastructure/repositories/SqlRcaRepository';
import { SqlTaxonomyRepository } from '../../infrastructure/repositories/SqlTaxonomyRepository';
import { z } from 'zod';
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

    public getAll = (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 0; // 0 = retorna todos (compatibilidade)
            const full = req.query.full === 'true';

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
                // Retorna todos os registros. Utiliza versão completa ou resumida baseado no parâmetro 'full'.
                const rcas = full ? this.rcaRepo.findAll() : this.rcaRepo.findAllSummary();
                res.json(rcas);
            }
        } catch (error) {
            console.error('[V2] Erro ao listar RCAs:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    public getById = (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const rca = this.rcaRepo.findById(id);
            if (!rca) {
                return res.status(404).json({ error: 'Análise não encontrada' });
            }
            res.json(rca);
        } catch (error) {
            console.error('[V2] Erro ao buscar RCA por ID:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    public create = (req: Request, res: Response) => {
        try {
            const parse = rcaSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({ error: 'Dados inválidos', details: parse.error.format() });
            }

            const taxonomy = this.taxonomyRepo.getTaxonomy();
            const result = this.rcaService.createRca(parse.data as any, taxonomy);

            res.status(201).json({
                message: 'Análise criada com sucesso',
                status: result.rca.status,
                statusReason: result.statusReason,
                ...result.rca
            });
        } catch (error) {
            console.error('[V2] Erro ao criar RCA:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    public update = (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const parse = rcaSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({ error: 'Dados inválidos', details: parse.error.format() });
            }

            const taxonomy = this.taxonomyRepo.getTaxonomy();
            // O serviço gerencia o recálculo de status e a persistência no repositório
            const result = this.rcaService.updateRca(id, parse.data, taxonomy);

            res.json({
                message: 'Análise atualizada com sucesso',
                status: result.rca.status,
                statusChanged: result.statusChanged,
                statusReason: result.statusReason,
                ...result.rca 
            });
        } catch (error) {
            console.error('[V2] Erro ao atualizar RCA:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    public delete = (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            this.rcaRepo.delete(id);
            res.json({ message: 'Análise excluída com sucesso' });
        } catch (error) {
            console.error('[V2] Erro ao excluir RCA:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    public bulkImport = (req: Request, res: Response) => {
        try {
            const body = req.body;
            let rcasRaw: any[] = [];
            let actionsRaw: any[] = [];

            // Suporte a dois formatos: Array direto ou objeto estruturado { records: [], actions: [] }
            if (Array.isArray(body)) {
                rcasRaw = body;
            } else if (body && Array.isArray(body.records)) {
                rcasRaw = body.records;
                actionsRaw = Array.isArray(body.actions) ? body.actions : [];
            } else {
                return res.status(400).json({ error: 'Formato de corpo inválido. Esperado array ou { records: [] }' });
            }

            const parse = z.array(rcaSchema).safeParse(rcasRaw);
            if (!parse.success) {
                return res.status(400).json({ error: 'Dados inválidos no lote de importação', details: parse.error.format() });
            }

            const taxonomy = this.taxonomyRepo.getTaxonomy();
            const result = this.rcaService.bulkImport(parse.data as any[], taxonomy, actionsRaw);

            res.json({ message: `Importação de ${result.count} análises concluída com cálculo dinâmico de status` });

        } catch (error) {
            console.error('[V2] Erro na importação em massa:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    public bulkDelete = (req: Request, res: Response) => {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids)) {
                return res.status(400).json({ error: 'O corpo deve conter um array de "ids"' });
            }

            console.log(`[V2] 🗑️ Excluindo ${ids.length} análises em lote...`);
            this.rcaRepo.bulkDelete(ids);

            res.json({ message: `${ids.length} análises excluídas com sucesso` });
        } catch (error) {
            console.error('[V2] Erro na exclusão em massa:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}