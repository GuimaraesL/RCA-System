
const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'i18n/locales/pt.ts');
const destPath = path.join(__dirname, 'i18n/locales/pt_temp.json');

try {
    let content = fs.readFileSync(srcPath, 'utf8');

    // 1. Remover imports (Simplesmente remover tudo até 'export const')
    const exportIndex = content.indexOf('export const pt');
    if (exportIndex === -1) throw new Error('Could not find export const pt');

    // Pegar do export para frente
    let newContent = content.substring(exportIndex);

    // 2. Substituir a declaração até o primeiro '{'
    const braceIndex = newContent.indexOf('{');
    if (braceIndex === -1) throw new Error('Could not find starting brace');

    const jsonBody = newContent.substring(braceIndex); // começa do {

    // Construir o código JS válido
    const finalCode = 'const pt = ' + jsonBody;

    // 3. Eval e Salvar
    eval(finalCode);

    fs.writeFileSync(destPath, JSON.stringify(pt, null, 4), 'utf8');
    console.log('JSON gerado com sucesso em: ' + destPath);

} catch (e) {
    console.error('Erro ao converter TS:', e);
    process.exit(1);
}
