import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpError, ErrorCode, ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { NewsRssService } from './services/newsRssService.js';
import z from 'zod';
import { ServerToolManager } from './impl/serverToolManager.js';


export class NewsRssMCPServer {
  private server:Server;
  private service:NewsRssService | undefined;
  private toolManager:ServerToolManager | undefined;

  constructor() {
    this.server = new Server(
      {
        name: "mcp-google-news-rss",
        version: "1.0.1"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Only setup handlers that DON'T depend on managers here
    this.setupServerHandlers();
    this.setupErrorHandling(); // Error handling can also be set up early
  }

  async initialize():Promise<void> {   

    this.service = new NewsRssService();

    this.toolManager = new ServerToolManager(this.service);

    await Promise.all([
      this.toolManager.initialize()
    ]);

    this.setupToolHandlers();

    console.log("MCP File Server initialized with config:");
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupServerHandlers(): void {
    const ServerInfoRequestSchema = z.object({
      method: z.literal("server/info"),
    });

    this.server.setRequestHandler(ServerInfoRequestSchema, async () => {
      return {
        name: "mcp-google-news-rss",
        version: "1.0.1",
      };
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return await (this.toolManager as ServerToolManager).listTools();
    });

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request, extra) => {
        try {
          const result = await (this.toolManager as ServerToolManager).executeTool(
            request.params.name,
            request.params.arguments || {}
          );
          return {
            content: result.content,
            _meta: extra,
          };
        } catch (error: any) {
          // 툴 실행 시 McpError를 던지기 때문에 그대로 전달.
          throw error;
        }
      }
    );
  }


  async run(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log("MCP google news rss Server started");
    } catch (error) {
      console.error("Failed to start MCP google news rss Server:", error);
      throw error;
    }
  }

}

async function main() {
  const newsRssServer = new NewsRssMCPServer();
  await newsRssServer.initialize(); // 핸들러 설정 및 매니저 초기화
  await newsRssServer.run(); // 서버 시작
}

main(); // NewsRssMCPServer 인스턴스 실행