/**
 * Teste: I18nAudit.test.ts (GLOBAL)
 * 
 * Proposta: Auditar o código-fonte em busca de strings hardcoded em UI e Canvas.
 * Regras: 
 * 1. Zero tolerância para texto novo em JSX (> Texto <).
 * 2. Zero tolerância para atributos fixos (placeholder, title, label, alt, fillText).
 * 3. Todas as chaves t() devem existir nos locais sincronizados.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { pt } from '../../i18n/locales/pt';
import { en } from '../../i18n/locales/en';

describe('Auditoria Global de Internacionalização (Zero-Tolerance)', () => {

  const getAllFiles = (dir: string, fileList: string[] = []): string[] => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        if (!['node_modules', 'dist', 'locales', '__tests__', 'coverage', '.agent', '.git'].includes(file)) {
          getAllFiles(filePath, fileList);
        }
      } else if ((filePath.endsWith('.tsx') || filePath.endsWith('.ts')) &&
        !filePath.includes('.test.') &&
        !filePath.includes('.spec.') &&
        !filePath.endsWith('types.ts') &&
        !filePath.endsWith('en.ts') &&
        !filePath.endsWith('pt.ts')) {
        fileList.push(filePath);
      }
    });
    return fileList;
  };

  const srcDir = path.resolve(process.cwd(), 'src');
  const files = getAllFiles(srcDir);

  it('Nenhum componente deve conter strings fixas em atributos ou Canvas (fillText)', () => {
    const violations: string[] = [];
    // Adicionado fillText para capturar textos em Canvas do ForceGraph
    const attrRegex = /(placeholder|title|label|alt|fillText|strokeText)="([^"{][^"]+)"/g;
    const canvasRegex = /ctx\.fillText\(\s*['"]([^'"]+)['"]/g;

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        let match;
        // Check Attributes
        while ((match = attrRegex.exec(line)) !== null) {
          const [_, attr, value] = match;
          if (!value.includes('-') && !value.includes('/') && value.trim().length > 1 && !/^[0-9.]+$/.test(value)) {
            violations.push(`${path.relative(process.cwd(), file)}:${index + 1} -> Atributo '${attr}' com valor fixo: "${value}"`);
          }
        }
        // Check Canvas fillText
        while ((match = canvasRegex.exec(line)) !== null) {
          const value = match[1];
          if (value.trim().length > 1) {
            violations.push(`${path.relative(process.cwd(), file)}:${index + 1} -> Canvas fillText com valor fixo: "${value}"`);
          }
        }
      });
    });

    if (violations.length > 0) {
      console.warn('⚠️ VIOLAÇÕES DE ATRIBUTOS/CANVAS HARDCODED:\n' + violations.join('\n'));
    }

    // REDUÇÃO DRÁSTICA: Agora falha se houver qualquer violação
    expect(violations.length).toBe(0);
  });

  it('Nenhum componente deve conter texto puro entre tags JSX', () => {
    const violations: string[] = [];
    const jsxTextRegex = />\s*([A-Za-zÀ-ÖØ-öø-ÿ][^<{]+)\s*</g;

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (line.includes('// ignore-i18n')) return;
        
        let match;
        while ((match = jsxTextRegex.exec(line)) !== null) {
          const text = match[1].trim();
          if (
            text.length > 1 &&
            !text.startsWith('{') &&
            !text.endsWith('}') &&
            !text.includes('className') &&
            !['Version', 'Promise', 'void', 'string', 'number', 'boolean', 'any', 'new Date', 'prev =>', '=>', 'http'].some(kw => text.includes(kw))
          ) {
            violations.push(`${path.relative(process.cwd(), file)}:${index + 1} -> Texto JSX fixo: "${text}"`);
          }
        }
      });
    });

    if (violations.length > 0) {
      console.warn('❌ TEXTO JSX HARDCODED FOUND:\n' + violations.join('\n'));
    }

    // ZERO TOLERÂNCIA
    expect(violations.length).toBe(0);
  });

  it('Todas as chaves usadas via t() devem existir nos dicionários sincronizados', () => {
    const ptDict = pt;
    const enDict = en;

    const resolveKey = (obj: Record<string, any>, keyPath: string): any => {
      return keyPath.split('.').reduce((acc, part) => acc?.[part], obj);
    };

    const violations: string[] = [];
    const tCallRegex = /\bt\(\s*['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]+)['"]\s*\)/g;

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (line.includes('${')) return;
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;

        let match;
        while ((match = tCallRegex.exec(line)) !== null) {
          const key = match[1];
          const ptValue = resolveKey(ptDict, key);
          const enValue = resolveKey(enDict, key);

          if (ptValue === undefined) {
            violations.push(`${path.relative(process.cwd(), file)}:${index+1} -> '${key}' ausente no PT`);
          }
          if (enValue === undefined) {
            violations.push(`${path.relative(process.cwd(), file)}:${index+1} -> '${key}' ausente no EN`);
          }
        }
      });
    });

    if (violations.length > 0) {
      console.warn('\n🔑 CHAVES DE TRADUÇÃO AUSENTES:\n' + violations.join('\n'));
    }

    expect(violations).toEqual([]);
  });
});
