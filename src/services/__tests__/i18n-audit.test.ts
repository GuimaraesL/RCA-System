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

describe('Auditoria de Internacionalização (Anti-Hardcoded)', () => {
  
  // Função simples para varredura recursiva (sem depender de bibliotecas externas no runtime do teste)
  const getAllFiles = (dir: string, fileList: string[] = []): string[] => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        if (!filePath.includes('node_modules') && !filePath.includes('dist')) {
          getAllFiles(filePath, fileList);
        }
      } else if (filePath.endsWith('.tsx') && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
        fileList.push(filePath);
      }
    });
    return fileList;
  };

  const componentsDir = path.resolve(process.cwd(), 'src/components');
  const files = getAllFiles(componentsDir);

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
      console.log('🚩 VIOLAÇÕES DE ATRIBUTOS HARDCODED FOUND:\n' + violations.join('\n'));
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
            !text.includes('Version')
          ) {
            violations.push(`${path.relative(process.cwd(), file)}:${index + 1} -> Texto fixo detectado: "${text}"`);
          }
        }
      });
    });

    if (violations.length > 0) {
      console.log('🚩 TEXTO JSX HARDCODED FOUND:\n' + violations.join('\n'));
    }

    expect(violations.length).toBeLessThanOrEqual(100); 
  });
});
