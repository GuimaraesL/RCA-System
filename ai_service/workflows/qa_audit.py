# AI Service - Workflow de Auditoria de Qualidade de RCA (QA Gate)
# Este workflow avalia uma RCA preenchida para garantir o rigor técnico.
from agno.workflow import Step, Workflow
from agno.agent import Agent
from agno.models.google import Gemini

# 1. Agente de Lógica Crítica: Foco em 5 Porquês e Ishikawa
logic_auditor = Agent(
    name="RCA_Logic_Auditor",
    role="Crítico Lógico e Metodológico",
    model=Gemini(id="gemini-2.0-flash"),
    instructions=[
        "Você é um Auditor Sênior de Qualidade de RCA.",
        "Sua tarefa é receber um relatório de RCA em JSON e focar EXCLUSIVAMENTE na validade lógica dos 5 Porquês e/ou Ishikawa (Causas Raízes).",
        "Regras para validação:",
        "1. A causa raiz listada é realmente sistêmica (ex: falha de manutenção, falta de padrão, limite de projeto) ou é apenas um sintoma técnico (ex: 'peça quebrou')?",
        "2. Há um salto lógico injustificado entre o problema e a causa?",
        "3. O erro humano é citado como causa raiz sem investigar a causa sistêmica subjacente (fadiga, falta de treinamento)?",
        "Gere um parecer crítico, mas respeitoso e direto. Liste as 'Red Flags Lógicas' encontradas ou diga que a lógica está robusta."
    ],
    markdown=True,
)

# 2. Agente de Ações: Foco em 5W2H e Contramedidas
action_auditor = Agent(
    name="RCA_Action_Auditor",
    role="Inspetor de Efetividade de Plano de Ação",
    model=Gemini(id="gemini-2.0-flash"),
    instructions=[
        "Você é um Especialista em Eficácia de Manutenção.",
        "Sua tarefa é analisar o Plano de Ação (Ações de Contenção, Corretivas e Confiabilidade Humana) da RCA e as críticas lógicas geradas pelo passo anterior.",
        "Regras para validação do Plano de Ação:",
        "1. As ações propostas ATACAM A CAUSA RAIZ real ou são meros paliativos/curativos ('trocar peça', 'limpar máquina')?",
        "2. Existem ações vagas/inúteis (ex: 'Prestar mais atenção', 'Conversar com a equipe')?",
        "3. (Crucial) As ações mitigam as 'Red Flags' levantadas pelo auditor anterior?",
        "Retorne suas críticas organizadas na categoria 'Análise do Plano de Ação'."
    ],
    markdown=True,
)

# 3. Consolidar e Dar o Score Final
final_evaluator = Agent(
    name="RCA_Score_Evaluator",
    role="Avaliador de Score de RCA",
    model=Gemini(id="gemini-2.0-flash"),
    instructions=[
        "Você é o último passo do Workflow. Você tem acesso automático ao histórico recente (as análises do Logic Auditor e do Action Auditor).",
        "Seu objetivo é gerar o 'Relatório Final de Qualidade da RCA' para o engenheiro.",
        "FORMATO OBRIGATÓRIO DE SAÍDA (MARKDOWN):",
        "### 🏆 Score de Qualidade: [0 a 10]/10",
        "*(Subtraia 2 pontos para cada falha lógica grave; 1 ponto para ações vagas)*",
        "",
        "### 🚨 Red Flags Encontradas",
        "- [Liste os pontos fracos da análise de causa]",
        "- [Liste os problemas do plano de ação]",
        "",
        "### 💡 O que precisa melhorar antes de fechar a RCA",
        "- [Dê diretrizes acionáveis e práticas para o autor da RCA. Se a RCA for perfeita (Score 10/10), parabenize o autor e diga que está pronta para encerramento.]"
    ],
    markdown=True,
)

def get_qa_audit_workflow():
    """
    Workflow determinístico que não interage via chat.
    É um 'Fire-and-Forget' que recebe a RCA e cospe um relatório de auditoria.
    """
    return Workflow(
        name="RCA_QA_Audit",
        description="Audita a consistência lógica e efetividade do plano de ação de uma RCA.",
        steps=[
            Step(
                name="logic_validation",
                description="Analisa os 5 Porquês e a validade sistêmica das Causas Raízes.",
                agent=logic_auditor
            ),
            Step(
                name="action_validation",
                description="Critica o Plano de Ação para checar se ele de fato ataca a raiz detectada no passo anterior.",
                agent=action_auditor
            ),
            Step(
                name="final_scoring",
                description="Lê todos os outputs anteriores e gera o Score de Qualidade final com as diretrizes de melhoria. NÃO PEÇA PARA O USUÁRIO ENVIAR NADA.",
                agent=final_evaluator
            )
        ]
    )
