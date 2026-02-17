
/**
 * Proposta: Utilitários para parsing e normalização de tipos de dados.
 * Fluxo: Provê lógica para conversão de datas em diversos formatos (ISO, PT-BR, Excel Serial) para um formato padronizado de sistema.
 */

/**
 * Converte strings de data (incluindo formatos do Excel) para ISO String.
 * Suporta datas seriais do Excel e formato padrão DD/MM/YYYY HH:mm.
 */
export const parseDateString = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const cleanStr = String(dateStr).trim();

        // 1. Detecção de Data Serial do Excel (ex: "45848")
        if (/^\d+([.,]\d+)?$/.test(cleanStr)) {
            const serial = parseFloat(cleanStr.replace(',', '.'));
            if (!isNaN(serial) && serial > 20000) {
                const utcDays = Math.floor(serial - 25569);
                const utcValue = utcDays * 86400; 
                const dateInfo = new Date(utcValue * 1000);

                const fractionalDay = serial - Math.floor(serial) + 0.0000001;
                const totalSeconds = Math.floor(86400 * fractionalDay);

                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                dateInfo.setUTCHours(hours, minutes, seconds);
                return dateInfo.toISOString();
            }
        }

        // 2. Formatos Padrão (DD/MM/YYYY)
        const parts = cleanStr.split(' ');
        const dateParts = parts[0].split('/');

        if (dateParts.length === 3) {
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = dateParts[2];

            if (parseInt(month) > 12 || parseInt(day) > 31) return '';

            const time = parts[1] || '00:00';
            return `${year}-${month}-${day}T${time}`;
        }

        // 3. Fallback: Construtor nativo do Date
        const fallback = new Date(cleanStr);
        if (!isNaN(fallback.getTime())) {
            return fallback.toISOString();
        }

        return '';
    } catch (e) {
        console.warn('Falha ao processar data:', dateStr, e);
        return '';
    }
};
