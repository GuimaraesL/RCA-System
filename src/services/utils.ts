/**
 * Proposta: Utilitários globais de infraestrutura e manipulação de dados do frontend.
 * Fluxo: Provê geradores de IDs únicos, saneamento de strings contra XSS, estruturas padrão de checklists e algoritmos de filtragem de árvore de ativos.
 */

import { AssetNode, PrecisionChecklistItem, HumanReliabilityAnalysis, HraQuestion, HraConclusion } from "../types";

export const generateId = (prefix: string = 'GEN'): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
};

/**
 * SEGURANÇA: Remove tags HTML de strings para prevenir vetores de Stored XSS em dados importados.
 */
export const sanitizeString = (str: any): string => {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>?/gm, '');
};

const STANDARD_PRECISION_ITEMS: PrecisionChecklistItem[] = [
    { id: "chk_clean", activity: "checklists.precision.chk_clean", question_snapshot: "checklists.precision.chk_clean", status: "", comment: "" },
    { id: "chk_tol", activity: "checklists.precision.chk_tol", question_snapshot: "checklists.precision.chk_tol", status: "", comment: "" },
    { id: "chk_lube", activity: "checklists.precision.chk_lube", question_snapshot: "checklists.precision.chk_lube", status: "", comment: "" },
    { id: "chk_belt", activity: "checklists.precision.chk_belt", question_snapshot: "checklists.precision.chk_belt", status: "", comment: "" },
    { id: "chk_load", activity: "checklists.precision.chk_load", question_snapshot: "checklists.precision.chk_load", status: "", comment: "" },
    { id: "chk_align", activity: "checklists.precision.chk_align", question_snapshot: "checklists.precision.chk_align", status: "", comment: "" },
    { id: "chk_bal", activity: "checklists.precision.chk_bal", question_snapshot: "checklists.precision.chk_bal", status: "", comment: "" },
    { id: "chk_torque", activity: "checklists.precision.chk_torque", question_snapshot: "checklists.precision.chk_torque", status: "", comment: "" },
    { id: "chk_parts", activity: "checklists.precision.chk_parts", question_snapshot: "checklists.precision.chk_parts", status: "", comment: "" },
    { id: "chk_func", activity: "checklists.precision.chk_func", question_snapshot: "checklists.precision.chk_func", status: "", comment: "" },
    { id: "chk_doc", activity: "checklists.precision.chk_doc", question_snapshot: "checklists.precision.chk_doc", status: "", comment: "" }
];

export const getStandardPrecisionItems = () => JSON.parse(JSON.stringify(STANDARD_PRECISION_ITEMS));

const STANDARD_HRA_QUESTIONS: HraQuestion[] = [
    { id: "1.1", category: "hraQuestionnaire.categories.procedures", question: "hraQuestionnaire.questions.q1_1", question_snapshot: "hraQuestionnaire.questions.q1_1", answer: "", comment: "" },
    { id: "1.3", category: "hraQuestionnaire.categories.procedures", question: "hraQuestionnaire.questions.q1_3", question_snapshot: "hraQuestionnaire.questions.q1_3", answer: "", comment: "" },
    { id: "1.4", category: "hraQuestionnaire.categories.procedures", question: "hraQuestionnaire.questions.q1_4", question_snapshot: "hraQuestionnaire.questions.q1_4", answer: "", comment: "" },
    { id: "2.1", category: "hraQuestionnaire.categories.training", question: "hraQuestionnaire.questions.q2_1", question_snapshot: "hraQuestionnaire.questions.q2_1", answer: "", comment: "" },
    { id: "2.2", category: "hraQuestionnaire.categories.training", question: "hraQuestionnaire.questions.q2_2", question_snapshot: "hraQuestionnaire.questions.q2_2", answer: "", comment: "" },
    { id: "3.1", category: "hraQuestionnaire.categories.external", question: "hraQuestionnaire.questions.q3_1", question_snapshot: "hraQuestionnaire.questions.q3_1", answer: "", comment: "" },
    { id: "4.1", category: "hraQuestionnaire.categories.routine", question: "hraQuestionnaire.questions.q4_1", question_snapshot: "hraQuestionnaire.questions.q4_1", answer: "", comment: "" },
    { id: "4.2", category: "hraQuestionnaire.categories.routine", question: "hraQuestionnaire.questions.q4_2", question_snapshot: "hraQuestionnaire.questions.q4_2", answer: "", comment: "" },
    { id: "5.1", category: "hraQuestionnaire.categories.organization", question: "hraQuestionnaire.questions.q5_1", question_snapshot: "hraQuestionnaire.questions.q5_1", answer: "", comment: "" },
    { id: "6.1", category: "hraQuestionnaire.categories.measures", question: "hraQuestionnaire.questions.q6_1", question_snapshot: "hraQuestionnaire.questions.q6_1", answer: "", comment: "" },
    { id: "6.2", category: "hraQuestionnaire.categories.measures", question: "hraQuestionnaire.questions.q6_2", question_snapshot: "hraQuestionnaire.questions.q6_2", answer: "" , comment: "" }
];

const STANDARD_HRA_CONCLUSIONS: HraConclusion[] = [
    { id: "procedures", label: "hraQuestionnaire.categories.procedures", selected: false, description: "" },
    { id: "training", label: "hraQuestionnaire.categories.training", selected: false, description: "" },
    { id: "external", label: "hraQuestionnaire.categories.external", selected: false, description: "" },
    { id: "routine", label: "hraQuestionnaire.categories.routine", selected: false, description: "" },
    { id: "organization", label: "hraQuestionnaire.categories.organization", selected: false, description: "" },
    { id: "measures", label: "hraQuestionnaire.categories.measures", selected: false, description: "" }
];

export const getStandardHraStruct = (): HumanReliabilityAnalysis => ({
    questions: JSON.parse(JSON.stringify(STANDARD_HRA_QUESTIONS)),
    conclusions: JSON.parse(JSON.stringify(STANDARD_HRA_CONCLUSIONS)),
    validation: { isValidated: "", comment: "" }
});

/**
 * Filtra a árvore de ativos mantendo apenas os ramos que possuem IDs utilizados em registros.
 * Implementa uma poda recursiva (pruning) para manter a integridade visual da hierarquia.
 */
export const filterAssetsByUsage = (allAssets: AssetNode[], usedIds: Set<string>): AssetNode[] => {
    const prune = (nodes: AssetNode[]): AssetNode[] => {
        return nodes.reduce<AssetNode[]>((acc, node) => {
            const isUsed = usedIds.has(node.id);
            const prunedChildren = node.children ? prune(node.children) : [];
            const hasUsedChildren = prunedChildren.length > 0;

            // Mantém o nó se ele for usado diretamente ou possuir descendentes utilizados
            if (isUsed || hasUsedChildren) {
                acc.push({
                    ...node,
                    children: prunedChildren
                });
            }
            return acc;
        }, []);
    };

    return prune(allAssets);
};