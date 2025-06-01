import { MCPToolManager, ToolContent } from "../core/toolManager.js";
import { NewsRssService } from "../services/newsRssService.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare class ServerToolManager implements MCPToolManager {
    private newsRssService;
    private toolListChangedCallbacks;
    private tools;
    constructor(newsRssService: NewsRssService);
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    listTools(cursor?: string): Promise<{
        tools: Tool[];
        nextCursor?: string;
    }>;
    executeTool(name: string, params: Record<string, any>): Promise<{
        content: ToolContent[];
        isError?: boolean;
    }>;
    onToolListChanged(callback: () => void): void;
    private notifyToolListChanged;
}
//# sourceMappingURL=serverToolManager.d.ts.map