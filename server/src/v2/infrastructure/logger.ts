import winston from 'winston';

/**
 * Proposta: Serviço centralizado de logging
 * Fluxo: Recebe logs da aplicação e direciona para os transports configurados (Console, Arquivo, etc)
 */

const { combine, timestamp, printf, colorize, json } = winston.format;

// Formato customizado para desenvolvimento (legível)
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        process.env.NODE_ENV === 'production' ? json() : combine(colorize(), devFormat)
    ),
    transports: [
        new winston.transports.Console(),
        // Adicionar transports de arquivo se necessário no futuro
        // new winston.transports.File({ filename: 'error.log', level: 'error' }),
        // new winston.transports.File({ filename: 'combined.log' }),
    ],
});

// Wrapper para compatibilidade se necessário, ou uso direto
export const logStream = {
    write: (message: string) => {
        logger.info(message.trim());
    },
};
