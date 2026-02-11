# Design System - RCA System

## 1. Identidade Visual
O design system do RCA System segue um estilo **Corporate Professional**, focado em clareza, eficiência e seriedade. Utiliza uma paleta de cores neutras e frias (Slate/Blue) para transmitir confiança e estabilidade, evitando estritamente tons de roxo/violeta.

### Tipografia
- **Display (Títulos):** Outfit (Moderno, geométrico, legível)
- **Body (Texto):** Inter (Neutro, altamente legível em interfaces densas)

### Espaçamento & Layout
Utiliza o sistema de grid de 8px (0.5rem) padrão do Tailwind.
- **Micro-espaçamento:** 4px, 8px
- **Componente-espaçamento:** 16px, 24px
- **Seção-espaçamento:** 48px, 64px

## 2. Paleta de Cores

### Brand Colors (Identidade)
- **Primary:** Blue-600 (`#2563eb`) - Ações principais, links, destaques.
- **Secondary:** Slate-700 (`#334155`) - Elementos secundários ou de suporte.
- **Accent:** Sky-500 (`#0ea5e9`) - Detalhes sutis, bordas de foco.

### Neutrals (Superfícies & Texto)
- **Surface 0 (Background):** Slate-50 (`#f8fafc`) - Fundo da página.
- **Surface 1 (Card/Container):** White (`#ffffff`) - Elementos principais.
- **Surface 2 (Hover/Active):** Slate-100 (`#f1f5f9`) - Elementos interativos.
- **Border:** Slate-200 (`#e2e8f0`) - Divisores sutis.
- **Text Primary:** Slate-900 (`#0f172a`) - Títulos e corpo principal.
- **Text Secondary:** Slate-500 (`#64748b`) - Legendas e metadados.

### Semantic Colors (Status)
- **Success:** Emerald-500 (`#10b981`) - Concluído, aprovado.
- **Warning:** Amber-500 (`#f59e0b`) - Em espera, atenção necessária.
- **Error:** Rose-500 (`#f43f5e`) - Atrasado, erro crítico.
- **Info:** Blue-500 (`#3b82f6`) - Informações gerais.

## 3. Componentes Core

### 3.1 Botões (Buttons)
Padronização de botões para ações claras.

- **Primary Button (Ação Principal)**
  - Background: `bg-blue-600` hover `bg-blue-700`
  - Text: `text-white`
  - Radius: `rounded-lg`
  - Shadow: `shadow-sm` hover `shadow-md`
  - Transition: `transition-all duration-200`

- **Secondary Button (Cancel/Back)**
  - Background: `bg-white` hover `bg-slate-50`
  - Border: `border border-slate-300`
  - Text: `text-slate-700`
  - Radius: `rounded-lg`

- **Danger Button (Delete)**
  - Background: `bg-rose-50` hover `bg-rose-100`
  - Text: `text-rose-600`
  - Border: `border border-rose-200`

### 3.2 Formulários (Inputs)
Campos de entrada limpos e acessíveis.

- **Base Input / Select / Textarea**
  - Background: `bg-white`
  - Border: `border-slate-300` focus `border-blue-500` ring `ring-blue-500/20`
  - Text: `text-slate-900` placeholder `text-slate-400`
  - Radius: `rounded-md`
  - Height: `h-10` standard

### 3.3 Tabelas (Tables)
Tabelas de alta densidade para dados técnicos.

- **Table Header**
  - Background: `bg-slate-50`
  - Text: `text-xs font-semibold text-slate-500 uppercase tracking-wider`
  - Border: `border-b border-slate-200`

- **Table Row**
  - Background: `bg-white` hover `bg-slate-50/50`
  - Border: `border-b border-slate-100` last:border-0
  - Cell Padding: `px-6 py-4` whitespace-nowrap

### 3.4 Cards
Containers principais de conteúdo.

- **Card Base**
  - Background: `bg-white`
  - Border: `border border-slate-200/60`
  - Shadow: `shadow-sm`
  - Radius: `rounded-xl`
  - Padding: `p-6`

## 4. Diretrizes de Uso

### O que EVITAR
- ❌ **ROXO/VIOLETA:** Não use cores da família purple, violet ou fuchsia.
- ❌ **Sombras Pesadas:** Evite drop-shadows pretos e densos. Use sombras suaves e coloridas.
- ❌ **Fontes Decorativas:** Mantenha apenas Inter e Outfit.

### O que PRIORIZAR
- ✅ **Feedback Claro:** Use cores de status consistentemente.
- ✅ **Espaço em Branco:** Deixe os dados "respirarem".
- ✅ **Micro-interações:** Adicione `hover` e `focus` states em tudo que for clicável.
