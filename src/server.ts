import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  McpError,
  ErrorCode,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { NewsRssService } from "./services/newsRssService.js";
import z from "zod";
import { ServerToolManager } from "./impl/serverToolManager.js";
import { logInfo, logWarning, logError, setLoggerServer } from "./logger.js";

export class NewsRssMCPServer {
  public server: Server;
  private service: NewsRssService | undefined;
  private toolManager: ServerToolManager | undefined;

  constructor() {
    this.server = new Server(
      {
        name: "mcp-google-news-rss",
        version: "1.0.1",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Only setup handlers that DON'T depend on managers here
    this.setupServerHandlers();
    this.setupErrorHandling(); // Error handling can also be set up early
  }

  async initialize(): Promise<void> {
    this.service = new NewsRssService();

    this.toolManager = new ServerToolManager(this.service);

    await Promise.all([this.toolManager.initialize()]);

    this.setupToolHandlers();

    // console.log("MCP File Server initialized with config:"); // MCP JSON-RPC 호환성을 위해 주석 처리
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      logError("[MCP Error] " + error);
    };

    process.on("SIGINT", async () => {
      logInfo("서버 종료 신호 수신, 리소스 정리 중...");
      try {
        if (this.toolManager) {
          await this.toolManager.cleanup();
        }
        await this.server.close();
        logInfo("서버 정상 종료 완료");
      } catch (error) {
        logError("서버 종료 중 오류: " + error);
      }
      await flushAndExit(0);
    });

    // === [안정성 및 예외 처리 코드 추가] ===
    // uncaughtException, unhandledRejection 핸들링
    process.on("uncaughtException", (err: any) => {
      logError(
        "uncaughtException 발생: " +
          (err && err.stack ? err.stack : String(err))
      );
      // 치명적 오류가 아니면 프로세스 유지, 필요시 graceful shutdown
    });
    process.on("unhandledRejection", (reason: any) => {
      logError(
        "unhandledRejection 발생: " +
          (reason && reason.stack ? reason.stack : String(reason))
      );
    });

    // EPIPE 등 파이프 오류 핸들링
    process.stdout.on("error", (err: any) => {
      if (err.code === "EPIPE") {
        logError(
          "stdout EPIPE 오류 발생: " +
            (err && err.stack ? err.stack : String(err))
        );
        process.exit(0);
      } else {
        logError(
          "stdout 오류 발생: " + (err && err.stack ? err.stack : String(err))
        );
      }
    });
    process.stderr.on("error", (err: any) => {
      if (err.code === "EPIPE") {
        logError(
          "stderr EPIPE 오류 발생: " +
            (err && err.stack ? err.stack : String(err))
        );
        process.exit(0);
      } else {
        logError(
          "stderr 오류 발생: " + (err && err.stack ? err.stack : String(err))
        );
      }
    });

    // process.exit() 전 stdout/stderr flush 보장
    async function flushAndExit(code: number) {
      function flush(stream: NodeJS.WriteStream) {
        return new Promise<void>((resolve) => {
          if (stream.writableLength === 0) return resolve();
          stream.write("", () => resolve());
        });
      }
      await Promise.all([flush(process.stdout), flush(process.stderr)]);
      process.exit(code);
    }
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
          const result = await (
            this.toolManager as ServerToolManager
          ).executeTool(request.params.name, request.params.arguments || {});
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
      logError("Failed to start MCP google news rss Server: " + error);
      throw error;
    }
  }
}

async function main() {
  const newsRssServer = new NewsRssMCPServer();
  await newsRssServer.initialize(); // 핸들러 설정 및 매니저 초기화
  await newsRssServer.run(); // 서버 시작
  setLoggerServer(newsRssServer.server);
}

main(); // NewsRssMCPServer 인스턴스 실행
