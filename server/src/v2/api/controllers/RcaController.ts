/**
 * Proposta: Controlador HTTP para gestão de Análises RCA.
 * Fluxo: Disponibiliza endpoints CRUD para manipulação de análises, orquestra operações em massa (Bulk) e integra a lógica de cálculo automático de status através do RcaService.
 */

import { Request, Response } from 'express';

import { RcaService } from '../../domain/services/RcaService';

import { SqlRcaRepository } from '../../infrastructure/repositories/SqlRcaRepository';

import { SqlTaxonomyRepository } from '../../infrastructure/repositories/SqlTaxonomyRepository';

import { logger } from '../../infrastructure/logger';

import { z } from 'zod';

import { rcaSchema } from '../schemas/validation';

import { NotFoundError, ValidationError } from '../../infrastructure/errors/AppError';


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

    }



    public getById = (req: Request, res: Response) => {

        const { id } = req.params;

        const rca = this.rcaRepo.findById(id);

        if (!rca) {

            throw new NotFoundError('Análise não encontrada');

        }

        res.json(rca);

    }



    public create = (req: Request, res: Response) => {

        const parse = rcaSchema.safeParse(req.body);

        if (!parse.success) {

            throw new ValidationError('Dados inválidos', parse.error.format());

        }



        const taxonomy = this.taxonomyRepo.getTaxonomy();

        const result = this.rcaService.createRca(parse.data as any, taxonomy);



        res.status(201).json({

            message: 'Análise criada com sucesso',

            status: result.rca.status,

            statusReason: result.statusReason,

            ...result.rca

        });

    }



    public update = (req: Request, res: Response) => {

        const { id } = req.params;

        const parse = rcaSchema.safeParse(req.body);

        if (!parse.success) {

            throw new ValidationError('Dados inválidos', parse.error.format());

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

    }



    public delete = (req: Request, res: Response) => {

        const { id } = req.params;

        this.rcaRepo.delete(id);

        res.json({ message: 'Análise excluída com sucesso' });

    }



    public bulkImport = (req: Request, res: Response) => {

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

            throw new ValidationError('Formato de corpo inválido. Esperado array ou { records: [] }');

        }



        const parse = z.array(rcaSchema).safeParse(rcasRaw);

        if (!parse.success) {

            throw new ValidationError('Dados inválidos no lote de importação', parse.error.format());

        }



        const taxonomy = this.taxonomyRepo.getTaxonomy();

        const result = this.rcaService.bulkImport(parse.data as any[], taxonomy, actionsRaw);



        res.json({ message: `Importação de ${result.count} análises concluída com cálculo dinâmico de status` });

    }



    public bulkDelete = (req: Request, res: Response) => {

        const { ids } = req.body;

        if (!ids || !Array.isArray(ids)) {

            throw new ValidationError('O corpo deve conter um array de "ids"');

        }



        logger.info(`[V2] Excluindo ${ids.length} análises em lote...`);

        this.rcaRepo.bulkDelete(ids);



        res.json({ message: `${ids.length} análises excluídas com sucesso` });

    }

}
