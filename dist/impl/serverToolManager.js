import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { InputSchema } from "../types/index.js";
export class ServerToolManager {
    constructor(newsRssService) {
        this.toolListChangedCallbacks = [];
        this.tools = [];
        this.newsRssService = newsRssService;
    }
    async initialize() {
        // 기본 도구 설정
        this.tools = [
            {
                name: "getGoogleNewsItems",
                description: `
        Retrieve an array of Google News article titles and links from the Google News RSS feed, filtered by the following parameters:

- **hl**: ISO 639-1 language code (e.g., \`en\` for English)
- **gl**: ISO 3166-1 alpha-2 country code (e.g., \`US\` for the United States)
- **keyword**: Search keyword
- **count**: Maximum number of results to return

**Example:**

\`\`\`plaintext
Input:
  hl = 'en'
  gl = 'US'
  keyword = 'artificial intelligence'
  count = 5

Output:
  [
    { "title": "Google unveils new AI model", "link": "https://news.google.com/..." },
    { "title": "AI trends in 2025", "link": "https://news.google.com/..." },
    ...
  ]
\`\`\`
        `,
                inputSchema: zodToJsonSchema(InputSchema)
            }
        ];
    }
    async cleanup() {
        // 필요한 정리 작업 수행
    }
    async listTools(cursor) {
        return { tools: this.tools };
    }
    async executeTool(name, params) {
        console.log("Executing tool:", name, params);
        // params 유효성 검사
        const parsedInput = InputSchema.safeParse(params);
        if (!parsedInput.success) {
            throw new McpError(ErrorCode.InvalidParams, "Invalid input parameters");
        }
        const newsResult = await this.newsRssService.getNewsRss(parsedInput.data);
        // 'error' 속성의 존재 여부로 타입을 구분
        if ('error' in newsResult) {
            // 실패: ErrorOutputSchema 타입인 경우
            const toolContents = [{
                    type: "text",
                    text: `Error fetching news: ${newsResult.error}`
                }];
            return {
                content: toolContents,
                isError: true
            };
        }
        else {
            // 성공: SuccessOutputSchema (아이템 배열) 타입인 경우
            const toolContents = newsResult.map(item => ({
                type: "text",
                text: `${item.title}: ${item.link}`
            }));
            return {
                content: toolContents,
                isError: false
            };
        }
    }
    onToolListChanged(callback) {
        this.toolListChangedCallbacks.push(callback);
    }
    notifyToolListChanged() {
        for (const callback of this.toolListChangedCallbacks) {
            callback();
        }
    }
}
