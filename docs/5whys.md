# Consumindo 5 Whys Hierárquico na UI

## Estrutura JSON Disponível

O JSON agora contém **duas estruturas** para os 5 Porquês:

```typescript
interface RCARecord {
  five_whys: FiveWhyFlat[];        // Lista plana (compatibilidade)
  five_whys_chains: FiveWhyChain[]; // Hierarquia em cascata (nova)
}
```

## Tipos TypeScript

```typescript
// Lista plana (fallback)
interface FiveWhyFlat {
  id: string;
  why_question: "Problem/Effect" | "Why 1" | "Why 2" | "Why 3" | "Why 4" | "Why 5";
  answer: string;
}

// Estrutura hierárquica
interface FiveWhyChain {
  chain_id: string;
  cause_effect: string;
  root_node: FiveWhyNode;
}

interface FiveWhyNode {
  id: string;
  level: number;  // 0=Causa, 1-5=Whys
  row?: number;
  cause_effect?: string;
  whys: { level: number; answer: string }[];
  children: FiveWhyNode[];
}
```

## Lógica de Consumo com Fallback

```typescript
function getFiveWhysData(record: RCARecord): FiveWhyChain[] | FiveWhyFlat[] {
  // Tentar usar estrutura hierárquica primeiro
  if (record.five_whys_chains && record.five_whys_chains.length > 0) {
    return record.five_whys_chains;
  }
  
  // Fallback para lista plana
  console.warn("Usando fallback: five_whys (lista plana)");
  return record.five_whys;
}

function isHierarchical(data: any): data is FiveWhyChain[] {
  return data?.[0]?.chain_id !== undefined;
}
```

## Componente React - Renderização Recursiva

```tsx
// Componente para nó hierárquico
function WhyNode({ node, depth = 0 }: { node: FiveWhyNode; depth?: number }) {
  const indent = depth * 24;
  
  return (
    <div style={{ marginLeft: indent }}>
      {/* Causa/Efeito (nível 0) */}
      {node.cause_effect && (
        <div className="cause-effect">
          <strong>Causa/Efeito:</strong> {node.cause_effect}
        </div>
      )}
      
      {/* Whys desta linha (horizontal) */}
      {node.whys.map((why, idx) => (
        <div key={idx} className={`why-level-${why.level}`}>
          <span className="why-label">Why {why.level}:</span>
          <span className="why-answer">{why.answer}</span>
        </div>
      ))}
      
      {/* Filhos (ramificações) */}
      {node.children.map(child => (
        <WhyNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

// Componente principal com fallback
function FiveWhysDisplay({ record }: { record: RCARecord }) {
  const data = getFiveWhysData(record);
  
  if (isHierarchical(data)) {
    // Renderização hierárquica
    return (
      <div className="five-whys-hierarchical">
        {data.map(chain => (
          <div key={chain.chain_id} className="chain">
            <h3>{chain.cause_effect}</h3>
            <WhyNode node={chain.root_node} />
          </div>
        ))}
      </div>
    );
  }
  
  // Fallback: lista plana
  return (
    <div className="five-whys-flat">
      {data.map(item => (
        <div key={item.id} className={`why-item ${item.why_question.replace(' ', '-').toLowerCase()}`}>
          <strong>{item.why_question}:</strong> {item.answer}
        </div>
      ))}
    </div>
  );
}
```

## CSS Básico

```css
.five-whys-hierarchical .chain {
  border-left: 3px solid #3b82f6;
  padding-left: 16px;
  margin-bottom: 24px;
}

.cause-effect {
  font-weight: 600;
  background: #fef3c7;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.why-level-1 { color: #dc2626; }
.why-level-2 { color: #ea580c; }
.why-level-3 { color: #ca8a04; }
.why-level-4 { color: #16a34a; }
.why-level-5 { color: #2563eb; font-weight: 600; }

.why-label {
  font-weight: 500;
  margin-right: 8px;
}
```

## Visualização em Árvore (Exemplo)

```
📍 Falha no corte da tesoura do Pay Off 2
    └── Why 1: Prensa chapas não segurava
        └── Why 2: Prensa chapas caido
            └── Why 3: Parafusos quebrados
                ├── Why 4: Guia forçando parafusos
                │   └── Why 5: Medidas fora do projeto ✓
                └── Why 4: [outra ramificação]
```
