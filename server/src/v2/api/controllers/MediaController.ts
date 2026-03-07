/**
 * Proposta: Controlador para gestão de mídias (anexos) de RCAs.
 * Fluxo: Gerencia o upload, listagem e remoção de arquivos físicos, integrando com o diretório de dados do servidor.
 */

import { Request, Response, NextFunction } from 'express';
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { logger } from '../../infrastructure/logger';
import { ValidationError, NotFoundError } from '../../infrastructure/errors/AppError';

export class MediaController {
    private mediaDir: string;

    constructor() {
        // Busca flexível do diretório de mídias para suportar diferentes CWDs
        // Primeiro tenta via __dirname para ser independente do CWD
        const dataDir = resolve(__dirname, '../../../../data/media');

        if (existsSync(dataDir)) {
            this.mediaDir = dataDir;
        } else {
            // Fallback para CWD (útil se rodando da raiz ou pasta server)
            const cwd = process.cwd();
            const cwdOptions = [
                join(cwd, 'data', 'media'),
                join(cwd, 'server', 'data', 'media')
            ];

            this.mediaDir = cwdOptions.find(p => existsSync(p)) || cwdOptions[0];
        }

        logger.info(`[Media] 📂 Diretório de mídias resolvido: ${this.mediaDir}`);

        if (!existsSync(this.mediaDir)) {
            mkdirSync(this.mediaDir, { recursive: true });
        }
    }

    /**
     * Realiza o upload de um arquivo para uma RCA específica.
     * Atualmente suporta envio de corpo bruto (raw) com metadados nos headers.
     */
    public upload = (req: Request, res: Response) => {
        const { rcaId } = req.params;
        const filename = req.header('x-filename');
        const contentType = req.header('content-type');

        if (!rcaId) throw new ValidationError('ID da RCA é obrigatório');
        if (!filename) throw new ValidationError('Header x-filename é obrigatório');

        const rcaFolder = join(this.mediaDir, rcaId);
        if (!existsSync(rcaFolder)) {
            mkdirSync(rcaFolder, { recursive: true });
        }

        const filePath = join(rcaFolder, filename);

        // req.body contém os dados brutos se o middleware express.raw() for usado
        if (!req.body || !(req.body instanceof Buffer)) {
            throw new ValidationError('Corpo da requisição deve conter os dados binários do arquivo');
        }

        writeFileSync(filePath, req.body);
        logger.info(`[Media] 📁 Arquivo salvo: ${filePath} (${req.body.length} bytes)`);

        res.status(201).json({
            message: 'Arquivo enviado com sucesso',
            filename,
            path: `/api/media/${rcaId}/${filename}`,
            size: req.body.length,
            type: contentType
        });
    }

    /**
     * Lista todos os arquivos anexados a uma RCA.
     */
    public listByRca = (req: Request, res: Response) => {
        const { rcaId } = req.params;
        const rcaFolder = join(this.mediaDir, rcaId);

        if (!existsSync(rcaFolder)) {
            return res.json([]);
        }

        const files = readdirSync(rcaFolder);
        res.json(files.map(f => ({
            filename: f,
            url: `/api/media/${rcaId}/${f}`
        })));
    }

    /**
     * Serve um arquivo específico com tratamento de erros robusto.
     */
    public serve = (req: Request, res: Response, next: NextFunction) => {
        const { rcaId, filename } = req.params;
        const filePath = resolve(this.mediaDir, rcaId, filename);

        logger.info(`[Media] 🔍 Tentativa de servir arquivo: ${filePath}`);

        if (!existsSync(filePath)) {
            logger.warn(`[Media] ⚠️ Arquivo não encontrado: ${filePath}`);
            return next(new NotFoundError('Arquivo não encontrado'));
        }

        res.sendFile(filePath, (err) => {
            if (err) {
                logger.error(`[Media] ❌ Erro ao enviar arquivo: ${filePath}`, { error: err.message });
                // Evita chamar next se os headers já foram enviados
                if (!res.headersSent) {
                    next(err);
                }
            }
        });
    }

    /**
     * Exclui um arquivo.
     */
    public delete = (req: Request, res: Response) => {
        const { rcaId, filename } = req.params;
        const filePath = join(this.mediaDir, rcaId, filename);

        if (existsSync(filePath)) {
            unlinkSync(filePath);
            logger.info(`[Media] 🗑️ Arquivo excluído: ${filePath}`);
        }

        res.json({ message: 'Arquivo excluído com sucesso' });
    }
}
