/**
 * Proposta: Middleware de autorização baseada em papéis (RBAC).
 * Fluxo: Verifica se o papel do usuário (injetado pelo AuthMiddleware) possui permissão para acessar o recurso solicitado.
 */

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';

/**
 * Papéis definidos no sistema conforme Issue #8:
 * - Visualizador: Acesso apenas leitura.
 * - Engenheiro: Criação e edição de RCAs e Ações.
 * - Administrador: Controle total (Taxonomia, Usuários, etc).
 */
export type UserRole = 'Visualizador' | 'Engenheiro' | 'Administrador';

export const rbacMiddleware = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            throw new UnauthorizedError('Usuário não autenticado');
        }

        const userRole = req.user.role as UserRole;

        if (!allowedRoles.includes(userRole)) {
            throw new ForbiddenError('Você não tem permissão para realizar esta ação');
        }

        next();
    };
};
