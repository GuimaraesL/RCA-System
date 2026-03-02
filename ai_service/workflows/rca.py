# AI Service - RCA Analysis Workflow (Agno Formal Workflow)
# Pipeline determinístico: Detective -> Specialist -> Writer
# Cada Step é um Agent formal da Agno, executado sequencialmente.

from agno.workflow import Step, Workflow
from agno.db.sqlite import SqliteDb

from agents.detective_agent import get_detective_agent
from agents.specialist_agent import get_specialist_agent
from agents.writer_agent import get_writer_agent
from core.memory import get_agent_memory


def get_rca_workflow(session_id: str, language: str = "Português-BR"):
    """
    Cria o Workflow formal de Análise de Causa Raiz.

    Pipeline determinístico:
    1. Detective Agent → Busca histórico e recorrências no RAG.
    2. Specialist Agent → Valida hipóteses técnicas via FMEA.
    3. Writer Agent → Formata o resultado em Ishikawa (Mermaid) e 5W2H.

    Cada step recebe automaticamente o output do anterior como contexto,
    garantindo a passagem de dados sem depender de prompt engineering.
    """
    detective = get_detective_agent(language)
    specialist = get_specialist_agent(language)
    writer = get_writer_agent(language)

    # Steps formais com nomes descritivos para rastreabilidade
    detective_step = Step(
        name="investigate_history",
        description="Busca recorrências e padrões no histórico de falhas (RAG)",
        agent=detective,
    )

    specialist_step = Step(
        name="validate_fmea",
        description="Valida hipóteses técnicas e modos de falha (FMEA)",
        agent=specialist,
    )

    writer_step = Step(
        name="format_output",
        description="Formata resultados em Ishikawa (Mermaid 6M) e Plano de Ação (5W2H)",
        agent=writer,
    )

    return Workflow(
        name="RCA_Analysis_Workflow",
        description="Pipeline de Análise de Causa Raiz: Investigação → Validação → Formatação",
        steps=[detective_step, specialist_step, writer_step],
        db=get_agent_memory(session_id),
    )
