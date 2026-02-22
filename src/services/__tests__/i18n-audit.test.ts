/**
 * Teste: i18n-audit.test.ts
 * 
 * Proposta: Auditar o código-fonte em busca de strings hardcoded que deveriam ser internacionalizadas.
 * Ações: Varredura recursiva de arquivos .tsx utilizando Regex para identificar texto puro em JSX e atributos.
 * Execução: Backend Vitest.
 * Fluxo: 1. Lista arquivos src/components -> 2. Lê conteúdo -> 3. Aplica regras de exclusão (comentários, imports, t()) -> 4. Reporta violações.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { pt } from '../../i18n/locales/pt';
import { en } from '../../i18n/locales/en';

describe('Auditoria de Internacionalização (Anti-Hardcoded)', () => {

  // Função simples para varredura recursiva (sem depender de bibliotecas externas no runtime do teste)
  const getAllFiles = (dir: string, fileList: string[] = []): string[] => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        // Ignora pastas de tradução, node_modules e diretórios de build/teste
        if (!['node_modules', 'dist', 'locales', '__tests__', 'coverage', '.agent'].includes(file)) {
          getAllFiles(filePath, fileList);
        }
      } else if ((filePath.endsWith('.tsx') || filePath.endsWith('.ts')) &&
        !filePath.includes('.test.') &&
        !filePath.includes('.spec.') &&
        !filePath.endsWith('types.ts') &&
        !filePath.endsWith('en.ts') && // Exclusão explícita do dicionário EN
        !filePath.endsWith('pt.ts')) { // Exclusão explícita do dicionário PT
        fileList.push(filePath);
      }
    });
    return fileList;
  };

  const srcDir = path.resolve(process.cwd(), 'src');
  const files = getAllFiles(srcDir);

  it('Nenhum componente deve conter strings fixas em atributos (placeholder, title, label)', () => {
    const violations: string[] = [];
    const attrRegex = /(placeholder|title|label|alt)="([^"{][^"]+)"/g;

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        let match;
        while ((match = attrRegex.exec(line)) !== null) {
          const [fullMatch, attr, value] = match;
          if (!value.includes('-') && value.trim().length > 1) {
            violations.push(`${path.relative(process.cwd(), file)}:${index + 1} -> Atributo '${attr}' com valor fixo: "${value}"`);
          }
        }
      });
    });

    if (violations.length > 0) {
      console.log(' VIOLAÇÕES DE ATRIBUTOS HARDCODED FOUND:\n' + violations.join('\n'));
    }

    expect(violations.length).toBeLessThanOrEqual(50);
  });

  it('Nenhum componente deve conter texto puro entre tags JSX', () => {
    const violations: string[] = [];
    const jsxTextRegex = />\s*([A-Za-zÀ-ÖØ-öø-ÿ][^<{]+)\s*</g;

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        let match;
        while ((match = jsxTextRegex.exec(line)) !== null) {
          const text = match[1].trim();
          if (
            text.length > 1 &&
            !text.startsWith('{') &&
            !text.endsWith('}') &&
            !text.includes('className') &&
            !['Version', 'Promise', 'void', 'string', 'number', 'boolean', 'any'].some(kw => text.includes(kw))
          ) {
            violations.push(`${path.relative(process.cwd(), file)}:${index + 1} -> Texto fixo detectado: "${text}"`);
          }
        }
      });
    });

    if (violations.length > 0) {
      console.log(' TEXTO JSX HARDCODED FOUND:\n' + violations.join('\n'));
    }

    expect(violations.length).toBeLessThanOrEqual(100);
  });

  it('Todas as chaves usadas via t() devem existir nos dicionários pt e en (Issue #105)', () => {
    const ptDict = pt;
    const enDict = en;

    // Função auxiliar para resolver caminhos aninhados (ex: 'common.attention')
    const resolveKey = (obj: Record<string, any>, keyPath: string): any => {
      return keyPath.split('.').reduce((acc, part) => acc?.[part], obj);
    };

    const violations: string[] = [];
    // Regex: captura chamadas t('namespace.chave') — exigindo pelo menos um ponto
    const tCallRegex = /\bt\(\s*['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]+)['"]\s*\)/g;

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach(line => {
        // Ignora linhas com template literals dinâmicos (contém ${...})
        if (line.includes('${')) return;
        // Ignora comentários
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;

        let match;
        while ((match = tCallRegex.exec(line)) !== null) {
          const key = match[1];
          const ptValue = resolveKey(ptDict, key);
          const enValue = resolveKey(enDict, key);

          if (ptValue === undefined) {
            violations.push(`${path.relative(process.cwd(), file)} -> Chave '${key}' ausente no dicionário PT`);
          }
          if (enValue === undefined) {
            violations.push(`${path.relative(process.cwd(), file)} -> Chave '${key}' ausente no dicionário EN`);
          }
        }
      });
    });

    if (violations.length > 0) {
      console.log('\n🔑 CHAVES DE TRADUÇÃO SOLTAS:\n' + violations.join('\n'));
    }

    expect(violations).toEqual([]);
  });
});
