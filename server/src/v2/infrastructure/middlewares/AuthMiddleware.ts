/**
 * Proposta: Middleware de autenticação JWT.
 * Fluxo: Verifica a presença e validade do token Bearer no header de autorização, injetando os dados do usuário na requisição.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/AppError';
import { logger } from '../logger';

// Extensão do tipo Request do Express para incluir o usuário decodificado
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
                name: string;
            };
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-para-dev';
const INTERNAL_AUTH_KEY = process.env.INTERNAL_AUTH_KEY || 'dev-key-change-it';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const internalKey = req.headers['x-internal-key'];

    // Autenticação Interna (Service-to-Service)
    if (internalKey === INTERNAL_AUTH_KEY) {
        req.user = {
            id: 'ai-service-agent',
            role: 'Administrador',
            name: 'RCA Detective Agent'
        };
        return next();
    }

    // AUTO-BYPASS em ambiente de desenvolvimento (YOLO MODE)
    // Se não houver token e estivermos em DEV, injetamos o Admin padrão
    if (!authHeader && process.env.NODE_ENV === 'development') {
        logger.info(`[Auth] 🔓 Bypass automático em DEV para: ${req.method} ${req.url}`);
        req.user = {
            id: 'dev-user-id',
            role: 'Administrador',
            name: 'Desenvolvedor Local'
        };
        return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn(`[Auth] 🔐 Tentativa de acesso sem token: ${req.method} ${req.url}`);
        throw new UnauthorizedError('Token não fornecido');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = {
            id: decoded.id,
            role: decoded.role,
            name: decoded.name
        };
        next();
    } catch (error) {
        logger.warn(`[Auth] ❌ Token inválido ou expirado: ${req.method} ${req.url}`);
        throw new UnauthorizedError('Token inválido ou expirado');
    }
};
