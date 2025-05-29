
import { MCPToolManager, ToolContent } from "../core/toolManager.js";
import { NewsRssService } from "../services/newsRssService.js";
import { McpError, ErrorCode, Tool } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { InputSchema, inputSchema } from "../types";

export class ServerToolManager implements MCPToolManager {
  private newsRssService: NewsRssService;
  private toolListChangedCallbacks: (() => void)[] = [];
  private tools: Tool[] = [];

  constructor(newsRssService: NewsRssService) {
    this.newsRssService = newsRssService;
  }

  async initialize(): Promise<void> {

    // 기본 도구 설정
    this.tools = [
      {
        name: "getGoogleNewsItems",
        description: "Get Google News title and link array from the Google News RSS feed. filtered by language, country, keyword and maximum count",
        inputSchema: zodToJsonSchema(InputSchema)
      }
    ];
  }

  async cleanup(): Promise<void> {
    // 필요한 정리 작업 수행
  }

  async listTools(cursor?: string): Promise<{
    tools: Tool[];
    nextCursor?: string;
  }> {
    return { tools: this.tools };
  }

  async executeTool(
    name: string,
    params: Record<string, any>
  ): Promise<{
    content: ToolContent[];
    isError?: boolean;
  }> {
    try {
      switch (name) {
        case "readFile":
          return await this.executeReadFile(params);
        case "writeFile":
          return await this.executeWriteFile(params);
        case "listDirectory":
          return await this.executeListDirectory(params);
        case "deleteFile":
          return await this.executeDeleteFile(params);
        default:
          throw new McpError(ErrorCode.InternalError, `Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text:
              error instanceof Error ? error.message : "Unknown error occurred",
          },
        ],
        isError: true,
      };
    }
  }

  onToolListChanged(callback: () => void): void {
    this.toolListChangedCallbacks.push(callback);
  }

  private notifyToolListChanged(): void {
    for (const callback of this.toolListChangedCallbacks) {
      callback();
    }
  }

  private async executeReadFile(params: Record<string, any>): Promise<{
    content: ToolContent[];
    isError?: boolean;
  }> {
    const { path: filePath } = params;
    const operation: FileOperation = {
      type: "read",
      path: filePath,
    };
    const result = await this.fileService.handleOperation(operation);

    if (!result.success || !result.data) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read file: ${filePath}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: result.data,
        },
      ],
    };
  }

  private async executeWriteFile(params: Record<string, any>): Promise<{
    content: ToolContent[];
    isError?: boolean;
  }> {
    const { path: filePath, content } = params;
    const operation: FileOperation = {
      type: "write",
      path: filePath,
      content,
    };
    const result = await this.fileService.handleOperation(operation);

    if (!result.success) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to write file: ${filePath}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully wrote to file: ${filePath}`,
        },
      ],
    };
  }

  private async executeListDirectory(params: Record<string, any>): Promise<{
    content: ToolContent[];
    isError?: boolean;
  }> {
    const { path: dirPath } = params;
    const operation: FileOperation = {
      type: "list",
      path: dirPath,
    };
    const result = await this.fileService.handleOperation(operation);

    if (!result.success || !result.data) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list directory: ${dirPath}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async executeDeleteFile(params: Record<string, any>): Promise<{
    content: ToolContent[];
    isError?: boolean;
  }> {
    const { path: filePath } = params;
    const operation: FileOperation = {
      type: "delete",
      path: filePath,
    };
    const result = await this.fileService.handleOperation(operation);

    if (!result.success) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete file: ${filePath}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted file: ${filePath}`,
        },
      ],
    };
  }
}
