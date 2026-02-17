/**
 * Teste: architecture.test.ts
 * 
 * Proposta: Garantir a integridade arquitetural do projeto através da validação de imports.
 * Ações: Varredura recursiva de arquivos .ts e .tsx para verificar se todos os caminhos de importação relativa existem.
 * Execução: Frontend Vitest.
 * Fluxo: Lista todos os arquivos -> Extrai caminhos de importação -> Resolve caminhos no sistema de arquivos -> Reporta imports quebrados.
 */

import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const PROJECT_ROOT = path.resolve(__dirname, '../../');

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

describe('Arquitetura e Integridade', () => {
    it('deve possuir imports relativos válidos em todos os arquivos fonte', () => {
        const srcDir = path.join(PROJECT_ROOT, 'src');
        const files = getAllFiles(srcDir);
        
        const errors: string[] = [];

        for (const filePath of files) {
            const content = fs.readFileSync(filePath, 'utf-8');

            // Regex simples para capturar imports
            const importRegex = /from\s+['"]([^'"]+)['"]/g;
            
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1];

                // Ignora imports de bibliotecas e absolutos
                if (!importPath.startsWith('.')) continue;

                const dir = path.dirname(filePath);
                const resolvedPath = path.resolve(dir, importPath);
                
                // Verifica existência do arquivo
                const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
                let found = false;

                for (const ext of extensions) {
                    if (fs.existsSync(resolvedPath + ext)) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    // Ignora assets estáticos
                    if (!importPath.match(/\.(png|svg|jpg|css)$/)) {
                        const relativeFile = path.relative(PROJECT_ROOT, filePath);
                        errors.push(`Arquivo: ${relativeFile} -> Import não encontrado: '${importPath}'`);
                    }
                }
            }
        }

        if (errors.length > 0) {
            console.error('\nImports Quebrados Encontrados:\n' + errors.join('\n'));
        }

        expect(errors).toHaveLength(0);
    });
});