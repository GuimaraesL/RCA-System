# Troubleshooting: Renderização de Gráficos (Recharts)

Este documento detalha a causa técnica e as soluções para o erro de dimensionamento detectado no `Dashboard.tsx`.

## 🚨 Descrição do Problema
**Erro:** `The width(-1) and height(-1) of chart should be greater than 0`.

Este erro ocorre no console do navegador quando o componente `ResponsiveContainer` do Recharts tenta calcular as dimensões do elemento pai para desenhar o gráfico, mas recebe valores inválidos ou zerados.

## 🔍 Causa Raiz Técnica

O problema é uma **condição de corrida (race condition)** entre o motor de layout do CSS (Browser Reflow) e o ciclo de vida do React. No arquivo `Dashboard.tsx`, os gráficos estão contidos em uma estrutura de `flexbox` dentro de um componente `ChartCard`.

### 1. Colapso de Altura do Flexbox
O container pai do gráfico utiliza a classe Tailwind `flex-1`. Em layouts Flexbox, a altura de um elemento `flex-1` é calculada com base no espaço disponível. Se o navegador ainda não terminou de calcular esse espaço no momento em que o componente React monta (`componentDidMount` ou `useEffect`), o Recharts tenta medir um container que ainda tem "altura 0".

### 2. Conflito com Animações CSS
O Dashboard utiliza a biblioteca `tailwindcss-animate` (`animate-in fade-in slide-in-from-top-4`). 
- As animações de entrada manipulam propriedades como `opacity` e `transform`.
- Durante a execução da animação (especialmente nos primeiros milissegundos), o navegador pode reportar dimensões parciais ou instáveis para o elemento, resultando no valor `-1` capturado pelo Recharts.

### 3. Implementação do `ResponsiveContainer`
O `ResponsiveContainer` utiliza um `ResizeObserver` (ou um debounce interno de medição). Se o elemento pai não possui uma altura fixa (`height`) ou uma altura mínima definida via CSS (`min-height`), o Recharts não consegue inferir quanto espaço ele deve ocupar, entrando em loop de erro ou exibindo o aviso de "width -1".

## 🛠️ Soluções Recomendadas (Para Desenvolvedores)

Para manter o design responsivo sem gerar erros de console, as seguintes abordagens devem ser seguidas:

### A. Definição de Altura Mínima no Container Pai (Recomendado)
A forma mais segura é garantir que o `div` que envolve o `ResponsiveContainer` tenha um tamanho físico mínimo garantido por CSS, antes mesmo do JS rodar.

```tsx
// Exemplo de correção no ChartCard (Dashboard.tsx)
<div className="flex-1 w-full min-h-[300px] relative"> {/* min-h garante a medida inicial */}
    <ResponsiveContainer width="100%" height="100%">
        ...
    </ResponsiveContainer>
</div>
```

### B. Uso da Propriedade `aspect`
Se o gráfico deve manter uma proporção fixa (ex: sempre quadrado ou 16:9), a prop `aspect` elimina a necessidade de medir a altura do pai.

```tsx
<ResponsiveContainer width="100%" aspect={2}> {/* Largura é 2x a altura */}
    <BarChart ... />
</ResponsiveContainer>
```

### C. Desativação de Animações em Ambiente de Teste
Para evitar que os testes de integração (Playwright) falhem ou capturem screenshots vazios, deve-se garantir que o estado `isMounted` ou uma flag global desative animações de entrada que retardam o cálculo do layout.

## 📊 Impacto no Usuário
- **Visual:** O gráfico pode não aparecer no primeiro carregamento, exigindo um redimensionamento da janela para "forçar" a aparição.
- **Performance:** Erros constantes no console poluem o log e podem causar pequenos engasgos na thread principal de renderização.

---
**Documentação gerada automaticamente por Auditoria de QA.**
