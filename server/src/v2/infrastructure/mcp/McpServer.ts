/**
 * Proposta: Servidor MCP (Model Context Protocol) para o RCA System.
 * Fluxo: Expõe ferramentas de domínio (RCA, Assets, FMEA) para agentes externos (Python/Agno) utilizando transporte SSE.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../logger';
import { SqlRcaRepository } from '../repositories/SqlRcaRepository';
import { SqlAssetRepository } from '../repositories/SqlAssetRepository';
import { SqlFmeaRepository } from '../repositories/SqlFmeaRepository';

export class McpServer {
    private server: Server;
    private rcaRepository: SqlRcaRepository;
    private assetRepository: SqlAssetRepository;
    private fmeaRepository: SqlFmeaRepository;
    private lastTransport: SSEServerTransport | null = null;
    private transports: Map<string, SSEServerTransport> = new Map();

    constructor() {
        this.server = new Server(
            {
                name: "rca-system-server",
                version: "3.0.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.rcaRepository = new SqlRcaRepository();
        this.assetRepository = new SqlAssetRepository();
        this.fmeaRepository = new SqlFmeaRepository();

        this.setupHandlers();
    }

    private setupHandlers() {
        // Listagem de Ferramentas (Discovery)
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "get_rca_context",
                    description: "Retorna o objeto completo da RCA (5W, Ishikawa, Causas, Status).",
                    inputSchema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                        },
                        required: ["id"],
                    },
                },
                {
                    name: "get_asset_fmea",
                    description: "Recupera todos os modos de falha registrados para um ativo técnico.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            asset_id: { type: "string" },
                        },
                        required: ["asset_id"],
                    },
                },
                {
                    name: "search_technical_taxonomy",
                    description: "Busca na hierarquia de ativos por nome ou tipo.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string" },
                        },
                        required: ["query"],
                    },
                }
            ],
        }));

        // Execução de Ferramentas (Invocation)
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case "get_rca_context": {
                        const rca = await this.rcaRepository.findById(args?.id as string);
                        if (!rca) throw new Error(`RCA ${args?.id} não encontrada.`);
                        return { content: [{ type: "text", text: JSON.stringify(rca, null, 2) }] };
                    }
                    case "get_asset_fmea": {
                        const modes = await this.fmeaRepository.findByAssetId(args?.asset_id as string);
                        return { content: [{ type: "text", text: JSON.stringify(modes, null, 2) }] };
                    }
                    case "search_technical_taxonomy": {
                        const assets = await this.assetRepository.findAll();
                        const query = (args?.query as string || '').toLowerCase();
                        const filtered = assets.filter((a: any) =>
                            a.name.toLowerCase().includes(query) ||
                            a.type.toLowerCase().includes(query)
                        );
                        return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
                    }
                    default:
                        throw new Error(`Ferramenta não encontrada: ${name}`);
                }
            } catch (error: any) {
                logger.error(`[MCP] ❌ Erro ao executar ferramenta ${name}:`, { error: error.message });
                return {
                    content: [{ type: "text", text: `Erro: ${error.message}` }],
                    isError: true,
                };
            }
        });
    }

    /**
     * Interface para o Express: Endpoint de Handshake SSE.
     */
    public async handleSse(req: any, res: any) {
        const ip = req.ip || req.connection.remoteAddress;
        logger.info(`[MCP] 📡 Handshake SSE iniciado. IP: ${ip}`);

        const port = process.env.PORT || 3001;
        const messageUrl = `http://localhost:${port}/api/mcp/message`;

        // Criar um novo transporte para esta conexão específica
        const transport = new SSEServerTransport(messageUrl, res);

        // Guardamos o último transporte para facilitar o roteamento de mensagens iniciais
        this.lastTransport = transport;

        res.on('close', () => {
            for (const [sid, t] of this.transports.entries()) {
                if ((t as any)._res === res) {
                    this.transports.delete(sid);
                    logger.info(`[MCP] 🛑 Sessão ${sid} encerrada e removida.`);
                    break;
                }
            }
        });

        try {
            await this.server.connect(transport);

            // Tenta capturar o sessionId gerado pelo SDK
            const sessionId = (transport as any)._sessionId;
            if (sessionId) {
                this.transports.set(sessionId, transport);
                logger.info(`[MCP] ✅ Conexão estabelecida para sessão: ${sessionId}`);
            }
        } catch (error) {
            logger.error(`[MCP] ❌ Erro ao conectar transporte:`, { error });
            if (!res.headersSent) {
                res.status(500).send("Erro ao inicializar MCP");
            }
        }
    }

    /**
     * Interface para o Express: Endpoint de Mensagens (POST).
     */
    public async handleMessage(req: any, res: any) {
        const sessionId = req.query.sessionId as string;

        if (!sessionId) {
            res.status(400).json({ error: "sessionId ausente" });
            return;
        }

        // Tenta buscar o transporte. Se não encontrar, espera brevemente (corrige race condition no handshake)
        let transport = this.transports.get(sessionId);

        if (!transport && this.lastTransport && (this.lastTransport as any)._sessionId === sessionId) {
            transport = this.lastTransport;
        }

        if (!transport) {
            // Pequeno delay para aguardar o registro da sessão no handshake assíncrono
            await new Promise(resolve => setTimeout(resolve, 250));
            transport = this.transports.get(sessionId);
        }

        if (!transport) {
            logger.warn(`[MCP] ⚠️ Sessão ${sessionId} não encontrada.`);
            res.status(400).json({ error: "Sessão não encontrada ou expirada" });
            return;
        }

        try {
            await transport.handlePostMessage(req, res);

            // Garantir que a sessão esteja no mapa (redundância)
            if (!this.transports.has(sessionId)) {
                this.transports.set(sessionId, transport);
            }
        } catch (error) {
            logger.error(`[MCP] ❌ Erro ao processar mensagem ${sessionId}:`, { error });
            if (!res.headersSent) {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
}
