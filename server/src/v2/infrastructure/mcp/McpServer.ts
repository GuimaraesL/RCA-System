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
    private transport: SSEServerTransport | null = null;

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

        // Tentamos usar a URL absoluta para evitar ambiguidades no cliente Python
        const port = process.env.PORT || 3001;
        const messageUrl = `http://localhost:${port}/api/mcp/message`;

        this.transport = new SSEServerTransport(messageUrl, res);

        try {
            await this.server.connect(this.transport);
            logger.info(`[MCP] ✅ Conexão estabelecida. Aguardando mensagens em ${messageUrl}`);
        } catch (error) {
            logger.error(`[MCP] ❌ Erro ao conectar transporte:`, { error });
            res.status(500).send("Erro ao inicializar MCP");
        }
    }

    /**
     * Interface para o Express: Endpoint de Mensagens (POST).
     */
    public async handleMessage(req: any, res: any) {
        logger.info(`[MCP] 📥 Nova mensagem JSON-RPC recebida.`);
        if (!this.transport) {
            logger.warn(`[MCP] ⚠️ Tentativa de POST sem transporte SSE ativo.`);
            res.status(400).json({ error: "Transporte SSE não inicializado" });
            return;
        }
        try {
            await this.transport.handlePostMessage(req, res);
            logger.info(`[MCP] 📤 Resposta enviada.`);
        } catch (error) {
            logger.error(`[MCP] ❌ Erro ao processar mensagem:`, { error });
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
}
