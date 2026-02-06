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
