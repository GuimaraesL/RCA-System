/**
 * Proposta: Serviço de domínio para gestão da Taxonomia e Configurações.
 * Fluxo: Atua como intermediário entre a camada de API e o repositório, garantindo a integridade dos dados de configuração do sistema.
 */

import { SqlTaxonomyRepository } from '../../infrastructure/repositories/SqlTaxonomyRepository';

import { TaxonomyConfig } from '../types/RcaTypes';

export class TaxonomyService {
    constructor(private taxonomyRepo: SqlTaxonomyRepository) { }

    public getTaxonomy(): TaxonomyConfig {
        return this.taxonomyRepo.getTaxonomy();
    }

    public updateTaxonomy(config: Partial<TaxonomyConfig>): void {
        this.taxonomyRepo.updateTaxonomy(config);
    }
}
