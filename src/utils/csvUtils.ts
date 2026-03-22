/**
 * Proposta: Utilitários para serialização e parsing de arquivos CSV.
 * Fluxo: Provê funções para detecção automática de separadores, conversão de arrays de objetos para CSV (com proteção contra injeção) e parser robusto para leitura de dados importados.
 */

/**
 * Detecta o separador mais provável (vírgula ou ponto e vírgula).
 */
export const detectSeparator = (headerLine: string): string => {
    const commas = (headerLine.match(/,/g) || []).length;
    const semicolons = (headerLine.match(/;/g) || []).length;
    return semicolons >= commas ? ';' : ',';
};

/**
 * Serializa array de objetos para string CSV.
 * Utiliza ponto e vírgula como delimitador para garantir compatibilidade com Excel em PT-BR.
 */
export const toCSV = (data: any[], headers: string[]): string => {
    const headerRow = headers.join(';'); 
    const rows = data.map(row => {
        return headers.map(fieldName => {
            let val = row[fieldName];
            
            // Tratamento de Arrays internos (ex: participantes)
            if (Array.isArray(val)) {
                val = val.join('|'); 
            } else if (val === undefined || val === null) {
                val = '';
            }

            let stringVal = String(val);

            // Prevenção de CSV Injection / Formula Injection
            if (/^[=+\-@]/.test(stringVal)) {
                stringVal = "'" + stringVal;
            }

            // Escapa aspas e envolve em aspas duplas se contiver delimitador ou quebra de linha
            if (stringVal.includes(';') || stringVal.includes('"') || stringVal.includes('\n')) {
                return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
        }).join(';');
    });
    return [headerRow, ...rows].join('\n');
};


/**
 * Parser de CSV robusto capaz de lidar com campos multi-linha e aspas escapadas.
 */
export const fromCSV = (csv: string): any[] => {
    // Limpeza rigorosa do BOM (Byte Order Mark) e normalização de quebras de linha
    const cleanCsv = csv.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

    let firstLineEnd = cleanCsv.indexOf('\n');
    if (firstLineEnd === -1) firstLineEnd = cleanCsv.length;
    const firstLine = cleanCsv.substring(0, firstLineEnd);
    const separator = detectSeparator(firstLine);

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentVal = '';
    let insideQuote = false;

    for (let i = 0; i < cleanCsv.length; i++) {
        const char = cleanCsv[i];
        const nextChar = cleanCsv[i + 1];

        if (char === '"') {
            if (insideQuote && nextChar === '"') {
                currentVal += '"';
                i++;
            } else {
                insideQuote = !insideQuote;
            }
        } else if (char === separator && !insideQuote) {
            currentRow.push(currentVal);
            currentVal = '';
        } else if ((char === '\r' || char === '\n') && !insideQuote) {
            if (char === '\r' && nextChar === '\n') i++;
            currentRow.push(currentVal);
            if (currentRow.length > 0 && currentRow.some(c => c.trim().length > 0)) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    if (currentRow.length > 0 || currentVal !== '') {
        currentRow.push(currentVal);
        if (currentRow.some(c => c.trim().length > 0)) {
            rows.push(currentRow);
        }
    }

    if (rows.length === 0) return [];

    const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, '')); 
    const dataRows = rows.slice(1);

    return dataRows.map(rowValues => {
        const obj: any = {};
        headers.forEach((h, index) => {
            const val = rowValues[index] || '';
            obj[h] = val.trim();
        });
        return obj;
    });
};
