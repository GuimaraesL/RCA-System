/**
 * Proposta: Middleware global de tratamento de erros do Express.
 * Fluxo: Captura qualquer erro lancado de forma sincrona nos controllers, formata e retorna JSON com o status code correto.
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { AppError } from '../errors/AppError';
import { ZodError } from 'zod';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // 1. Errors Customizados da Aplicação
    if (err instanceof AppError) {
        const payload: any = { error: err.message };

        // Se for um erro de validação (com details extras)
        if ('details' in err && (err as any).details) {
            payload.details = (err as any).details;
            logger.warn(`[V2 | ValidationError] ${req.method} ${req.url}: ${err.message}`, { details: payload.details });
        } else if (err.statusCode >= 500) {
            logger.error(`[V2 | AppError 500] ${req.method} ${req.url}: ${err.message}`, { stack: err.stack });
        } else {
            logger.warn(`[V2 | AppError ${err.statusCode}] ${req.method} ${req.url}: ${err.message}`);
        }

        res.status(err.statusCode).json(payload);
        return;
    }

    // 2. Erros de Validação Nativa do Zod (se escaparem do Service/Controller)
    if (err instanceof ZodError) {
        logger.warn(`[V2 | ZodError] ${req.method} ${req.url}: Falha de schema`, { details: err.format() });
        res.status(400).json({ error: 'Dados inválidos', details: err.format() });
        return;
    }

    // 3. Fallback (Unhanled Errors / Bugs de Codigo)
    logger.error(`[V2 | UnhandledError] ${req.method} ${req.url} - ${err.message}`, { stack: err.stack });

    res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};
