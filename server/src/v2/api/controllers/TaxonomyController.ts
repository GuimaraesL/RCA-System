/**
 * Proposta: Controlador HTTP para gestão da Taxonomia e Configurações Globais.
 * Fluxo: Disponibiliza endpoints para leitura e atualização do objeto central de taxonomia, delegando a persistência ao TaxonomyService.
 */

import { Request, Response } from 'express';
import { TaxonomyService } from '../../domain/services/TaxonomyService';
import { SqlTaxonomyRepository } from '../../infrastructure/repositories/SqlTaxonomyRepository';

export class TaxonomyController {
    private taxonomyService: TaxonomyService;

    constructor() {
        const repo = new SqlTaxonomyRepository();
        this.taxonomyService = new TaxonomyService(repo);
    }

    public get = (req: Request, res: Response): void => {
        try {
            res.json(this.taxonomyService.getTaxonomy());
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    public update = (req: Request, res: Response): void => {
        try {
            this.taxonomyService.updateTaxonomy(req.body);
            res.json({ message: 'Taxonomia atualizada com sucesso' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}