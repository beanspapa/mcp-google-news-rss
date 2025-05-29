import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpError, ErrorCode, ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { NewsRssService } from './services/newsRssService';
import z from 'zod';
import { ServerToolManager } from './impl/serverToolManager';

const server = new Server(
  {
    name: "mcp-google-news-rss", // 서버 이름 설정
    version: "1.0.0", // 서버 버전 설정
  },
  {
    // 서버의 기능 (리소스, 도구, 프롬프트 등) 활성화 여부 설정
    capabilities: {
      resources: {}, // 리소스 기능 활성화
      tools: {}, // 도구 기능 활성화
      prompts: {}, // 프롬프트 기능 활성화
    },
  }
);

export class NewsRssMCPServer {
  private server:Server;
  private service:NewsRssService;
  private toolManager:ServerToolManager;

  constructor() {
    this.server = new Server(
      {
        name: "mcp-google-news-rss",
        version: "1.0.1"
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {}
        }
      }
    );

    // Only setup handlers that DON'T depend on managers here
    this.setupServerHandlers();
    this.setupErrorHandling(); // Error handling can also be set up early
  }

  async initialize():Promise<void> {   

    this.service = new NewsRssService();

    this.toolManager = new ServerToolManager(this.fileService);

    await Promise.all([
      this.resourceManager.initialize(),
      this.toolManager.initialize(),
      this.promptManager.initialize(),
    ]);

    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();

    console.log("MCP File Server initialized with config:", this.config);
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
      return await this.toolManager.listTools();
    });

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request, extra) => {
        try {
          const result = await this.toolManager.executeTool(
            request.params.name,
            request.params.arguments || {}
          );
          return {
            content: result.content,
            _meta: extra,
          };
        } catch (error: any) {
          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error.message}`
          );
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


// 서버 실행 함수
async function runServer() {
  const transport = new StdioServerTransport(); // Stdio 기반 전송 사용
  await server.connect(transport);
}

runServer();
