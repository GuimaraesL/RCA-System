

import { AssetNode, PrecisionChecklistItem, HumanReliabilityAnalysis, HraQuestion, HraConclusion } from "../types";

export const generateId = (prefix: string = 'GEN'): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
};

// SECURITY: Sanitize function to strip potential HTML tags from imports
export const sanitizeString = (str: any): string => {
    if (typeof str !== 'string') return '';
    // Basic stripping of HTML tags to prevent Stored XSS vectors in raw data
    return str.replace(/<[^>]*>?/gm, '');
};

const STANDARD_PRECISION_ITEMS: PrecisionChecklistItem[] = [
    { id: "chk_clean", activity: "Área está limpa e arrumada", question_snapshot: "Área está limpa e arrumada", status: "NOT_APPLICABLE", comment: "" },
    { id: "chk_tol", activity: "Os ajustes e tolerâncias estão corretos", question_snapshot: "Os ajustes e tolerâncias estão corretos", status: "NOT_APPLICABLE", comment: "" },
    { id: "chk_lube", activity: "A lubrificação é limpa, livre de contaminantes, com a quantidade e qualidade adequadas", question_snapshot: "A lubrificação é limpa, livre de contaminantes, com a quantidade e qualidade adequadas", status: "NOT_APPLICABLE", comment: "" },
    { id: "chk_belt", activity: "A correia tem tensão e alinhamento corretos", question_snapshot: "A correia tem tensão e alinhamento corretos", status: "NOT_APPLICABLE", comment: "" },
    { id: "chk_load", activity: "Cargas estão suportadas corretamente com montagens rígidas e suportes", question_snapshot: "Cargas estão suportadas corretamente com montagens rígidas e suportes", status: "NOT_APPLICABLE", comment: "" },
    { id: "chk_align", activity: "Componentes (eixos, motores, redutores, bombas, rolos, ...) estão devidamente alinhados", question_snapshot: "Componentes (eixos, motores, redutores, bombas, rolos, ...) estão devidamente alinhados", status: "NOT_APPLICABLE", comment: "" },
    { id: "chk_bal", activity: "Componentes rotativos estão balanceados", question_snapshot: "Componentes rotativos estão balanceados", status: "NOT_APPLICABLE", comment: "" },
    { id: "chk_torque", activity: "Torques e Tensões estão corretos, utilizando torquímetros apropriados", question_snapshot: "Torques e Tensões estão corretos, utilizando torquímetros apropriados", status: "NOT_APPLICABLE", comment: "" },
    { id: "chk_parts", activity: "Utilizados somente peças de acordo com a especificação para o equipamento (no BOM)", question_snapshot: "Utilizados somente peças de acordo com a especificação para o equipamento (no BOM)", status: "NOT_APPLICABLE", comment: "" },
    { id: "chk_func", activity: "Teste Funcional executado", question_snapshot: "Teste Funcional executado", status: "NOT_APPLICABLE", comment: "" },
    { id: "chk_doc", activity: "As modificações foram devidamente documentadas (atualização de desenhos, procedimentos, etc)", question_snapshot: "As modificações foram devidamente documentadas (atualização de desenhos, procedimentos, etc)", status: "NOT_APPLICABLE", comment: "" }
];

export const getStandardPrecisionItems = () => JSON.parse(JSON.stringify(STANDARD_PRECISION_ITEMS));

const STANDARD_HRA_QUESTIONS: HraQuestion[] = [
    { id: "1.1", category: "Procedimentos e Comunicação", question: "Os procedimentos são precisos e revisados?", question_snapshot: "Os procedimentos são precisos e revisados?", answer: "", comment: "" },
    { id: "1.3", category: "Procedimentos e Comunicação", question: "Os procedimentos estão alinhados com as práticas reais?", question_snapshot: "Os procedimentos estão alinhados com as práticas reais?", answer: "", comment: "" },
    { id: "1.4", category: "Procedimentos e Comunicação", question: "Há comunicação apropriada e métodos de compartilhamento e escalonamento?", question_snapshot: "Há comunicação apropriada e métodos de compartilhamento e escalonamento?", answer: "", comment: "" },
    { id: "2.1", category: "Treinamentos, materiais e sua eficiência", question: "Os materiais de treinamento refletem as informações e conhecimentos necessários para as competências identificadas?", question_snapshot: "Os materiais de treinamento refletem as informações e conhecimentos necessários para as competências identificadas?", answer: "", comment: "" },
    { id: "2.2", category: "Treinamentos, materiais e sua eficiência", question: "Os conhecimentos e habilidades estão sendo adquiridos e retidos?", question_snapshot: "Os conhecimentos e habilidades estão sendo adquiridos e retidos?", answer: "", comment: "" },
    { id: "3.1", category: "Impactos externos (físicos e cognitivos)", question: "Há algum fator externo que possa afetar o desempenho do profissional: estresse, altos ruídos, calor/frio, vibração, atividades complexas, etc.?", question_snapshot: "Há algum fator externo que possa afetar o desempenho do profissional: estresse, altos ruídos, calor/frio, vibração, atividades complexas, etc.?", answer: "", comment: "" },
    { id: "4.1", category: "Trabalho rotineiro e monótono", question: "Há flexibilidade e treinamentos cruzados disponíveis para os profissionais?", question_snapshot: "Há flexibilidade e treinamentos cruzados disponíveis para os profissionais?", answer: "", comment: "" },
    { id: "4.2", category: "Trabalho rotineiro e monótono", question: "Os funcionários compreendem o valor e o impacto de seu trabalho?", question_snapshot: "Os funcionários compreendem o valor e o impacto de seu trabalho?", answer: "", comment: "" },
    { id: "5.1", category: "Organização do ambiente e dos processos", question: "As condições de trabalho têm situações que criam dificuldades práticas para os funcionários: localização e acesso as ferramentas/equipamentos, sequência ideal de tarefas e padrões apropriados em vigor?", question_snapshot: "As condições de trabalho têm situações que criam dificuldades práticas para os funcionários: localização e acesso as ferramentas/equipamentos, sequência ideal de tarefas e padrões apropriados em vigor?", answer: "", comment: "" },
    { id: "6.1", category: "Medidas contra falhas", question: "Existem medidas para ajudar a identificar erros potenciais durante tarefas críticas, atividades ou eventos não rotineiros?", question_snapshot: "Existem medidas para ajudar a identificar erros potenciais durante tarefas críticas, atividades ou eventos não rotineiros?", answer: "", comment: "" },
    { id: "6.2", category: "Medidas contra falhas", question: "Há erros que podem ter acontecido por falta de atenção?", question_snapshot: "Há erros que podem ter acontecido por falta de atenção?", answer: "", comment: "" }
];

const STANDARD_HRA_CONCLUSIONS: HraConclusion[] = [
    { id: "procedures", label: "Procedimentos e Comunicação", selected: false, description: "" },
    { id: "training", label: "Treinamentos, materiais e sua eficiência", selected: false, description: "" },
    { id: "external", label: "Impactos externos (físicos e cognitivos)", selected: false, description: "" },
    { id: "routine", label: "Trabalho rotineiro e monótono", selected: false, description: "" },
    { id: "organization", label: "Organização do ambiente e dos processos", selected: false, description: "" },
    { id: "measures", label: "Medidas contra falhas", selected: false, description: "" }
];



export const getStandardHraStruct = (): HumanReliabilityAnalysis => ({
    questions: JSON.parse(JSON.stringify(STANDARD_HRA_QUESTIONS)),
    conclusions: JSON.parse(JSON.stringify(STANDARD_HRA_CONCLUSIONS)),
    validation: { isValidated: "", comment: "" }
});

/**
 * Traverses the asset tree and keeps ONLY the branches that have IDs in the provided set.
 * Returns a pruned tree.
 */
export const filterAssetsByUsage = (allAssets: AssetNode[], usedIds: Set<string>): AssetNode[] => {
    const prune = (nodes: AssetNode[]): AssetNode[] => {
        return nodes.reduce<AssetNode[]>((acc, node) => {
            // Check if this node is used
            const isUsed = usedIds.has(node.id);

            // Recurse into children
            const prunedChildren = node.children ? prune(node.children) : [];
            const hasUsedChildren = prunedChildren.length > 0;

            // Keep node if it's used OR has used children
            if (isUsed || hasUsedChildren) {
                acc.push({
                    ...node,
                    children: prunedChildren // Replace children with pruned version
                });
            }
            return acc;
        }, []);
    };

    return prune(allAssets);
};
