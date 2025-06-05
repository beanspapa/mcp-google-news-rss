// 개발 환경에서 mcps-logger 활성화
if (process.env.NODE_ENV !== "production") {
  await import("mcps-logger/console");
}

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

    // console.log("MCP File Server initialized with config:"); // MCP JSON-RPC 호환성을 위해 주석 처리
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      console.log("서버 종료 신호 수신, 리소스 정리 중...");
      try {
        if (this.toolManager) {
          await this.toolManager.cleanup();
        }
        await this.server.close();
        console.log("서버 정상 종료 완료");
      } catch (error) {
        console.error("서버 종료 중 오류:", error);
      }
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
      // console.log("MCP google news rss Server started"); // MCP JSON-RPC 호환성을 위해 주석 처리
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