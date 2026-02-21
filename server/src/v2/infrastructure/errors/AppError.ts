/**
 * Proposta: Classe base para erros padronizados da API.
 * Fluxo: Herda de Error e adiciona statusCode e isOperational, permitindo que o middleware identifique e formate o erro confiavelmente.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Erro para recursos nao encontrados (HTTP 404).
 */
export class NotFoundError extends AppError {
    constructor(message: string = 'Recurso não encontrado') {
        super(message, 404);
    }
}

/**
 * Erro para falhas de validacao (HTTP 400).
 */
export class ValidationError extends AppError {
    public readonly details?: any;

    constructor(message: string = 'Erro de validação', details?: any) {
        super(message, 400);
        this.details = details;
    }
}

/**
 * Erro para regras de negocio nao atendidas (HTTP 400/422).
 */
export class BusinessError extends AppError {
    constructor(message: string = 'Erro de regra de negócio', statusCode: number = 400) {
        super(message, statusCode);
    }
}

/**
 * Erro para falhas de autenticação (HTTP 401).
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Não autorizado') {
        super(message, 401);
    }
}

/**
 * Erro para falhas de permissão (HTTP 403).
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Acesso proibido') {
        super(message, 403);
    }
}
