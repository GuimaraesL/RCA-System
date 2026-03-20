/**
 * TemplateService: Centraliza a lógica de visibilidade de componentes e passos do wizard
 * baseado no tipo de análise (RCA, Mini RCA, CAPA, etc).
 */

export const ANALYSIS_TYPE_IDS = {
    RCA: 'TYP-MMYYYVMJ-306',
    MINI_RCA: 'TYP-MMYYYVMJ-372',
    CAPA: 'TYP-MMYYYVMK-132'
} as const;

export type AnalysisComponent = 
    | 'GENERAL' 
    | 'PROBLEM' 
    | 'TECHNICAL' 
    | 'FIVE_WHYS' 
    | 'ISHIKAWA' 
    | 'ROOT_CAUSES' 
    | 'ACTIONS' 
    | 'MAINTENANCE' 
    | 'ADDITIONAL' 
    | 'RECURRENCES' 
    | 'HRA';

export interface AnalysisTemplate {
    typeId: string;
    name: string;
    visibleComponents: AnalysisComponent[];
}

const templates: Record<string, AnalysisTemplate> = {
    [ANALYSIS_TYPE_IDS.MINI_RCA]: {
        typeId: ANALYSIS_TYPE_IDS.MINI_RCA,
        name: 'Mini RCA',
        visibleComponents: ['GENERAL', 'PROBLEM', 'TECHNICAL', 'FIVE_WHYS', 'ROOT_CAUSES', 'ACTIONS', 'MAINTENANCE', 'ADDITIONAL', 'RECURRENCES', 'HRA']
    },
    [ANALYSIS_TYPE_IDS.RCA]: {
        typeId: ANALYSIS_TYPE_IDS.RCA,
        name: 'RCA Completo',
        visibleComponents: ['GENERAL', 'PROBLEM', 'TECHNICAL', 'FIVE_WHYS', 'ISHIKAWA', 'ROOT_CAUSES', 'ACTIONS', 'MAINTENANCE', 'ADDITIONAL', 'RECURRENCES', 'HRA']
    },
    [ANALYSIS_TYPE_IDS.CAPA]: {
        typeId: ANALYSIS_TYPE_IDS.CAPA,
        name: 'CAPA',
        visibleComponents: ['GENERAL', 'PROBLEM', 'ACTIONS', 'RECURRENCES']
    }
};

const defaultTemplate: AnalysisTemplate = templates[ANALYSIS_TYPE_IDS.RCA];

/**
 * Retorna o template baseado no ID ou Nome (robustez contra IDs gerados)
 */
export const getTemplateByTypeId = (typeIdOrName: string | undefined): AnalysisTemplate => {
    if (!typeIdOrName) return defaultTemplate;

    // 1. Match direto pelo ID (ex: 'TYP-MMYYYVMJ-306')
    if (templates[typeIdOrName]) return templates[typeIdOrName];

    // 2. Match pelo Nome ou ID (case insensitive / trim)
    const search = typeIdOrName.toLowerCase().trim();
    
    // Fallbacks para nomes comuns ou fragmentos
    if (search.includes('rca completo') || search === 'rca' || search.includes('análise de falha')) {
        return templates[ANALYSIS_TYPE_IDS.RCA];
    }
    if (search.includes('mini rca') || search === 'mini-rca' || search === 'mini') {
        return templates[ANALYSIS_TYPE_IDS.MINI_RCA];
    }
    if (search.includes('capa')) return templates[ANALYSIS_TYPE_IDS.CAPA];

    const foundByRef = Object.values(templates).find(t => 
        t.name.toLowerCase().includes(search) || 
        t.typeId.toLowerCase() === search ||
        search.includes(t.name.toLowerCase())
    );

    return foundByRef || defaultTemplate;
};

export const isComponentVisible = (typeId: string | undefined, component: AnalysisComponent): boolean => {
    const template = getTemplateByTypeId(typeId);
    return template.visibleComponents.includes(component);
};

/**
 * Verifica se um passo do wizard deve ser visível.
 * Esta função garante que o fluxo principal seja respeitado.
 */
export const isStepVisible = (typeId: string | undefined, stepId: number): boolean => {
    const template = getTemplateByTypeId(typeId);
    
    // Passo 1 sempre visível
    if (stepId === 1) return true;

    // Se o template for o de RCA Completo ou Mini RCA, garantimos que os passos essenciais 1 a 8 apareçam
    if (template.typeId === ANALYSIS_TYPE_IDS.RCA || template.typeId === ANALYSIS_TYPE_IDS.MINI_RCA) {
        if ([1, 2, 3, 4, 5, 6, 7, 8].includes(stepId)) return true;
    }

    const stepToComponentMap: Record<number, AnalysisComponent | 'INVESTIGATION'> = {
        1: 'GENERAL',
        2: 'PROBLEM',
        3: 'TECHNICAL',
        4: 'INVESTIGATION',
        5: 'ACTIONS',
        6: 'MAINTENANCE',
        7: 'ADDITIONAL',
        8: 'RECURRENCES',
        9: 'HRA'
    };

    const componentKey = stepToComponentMap[stepId];
    if (!componentKey) return true;

    if (componentKey === 'INVESTIGATION') {
        return template.visibleComponents.includes('FIVE_WHYS') || 
               template.visibleComponents.includes('ISHIKAWA') || 
               template.visibleComponents.includes('ROOT_CAUSES');
    }

    return template.visibleComponents.includes(componentKey as AnalysisComponent);
};
