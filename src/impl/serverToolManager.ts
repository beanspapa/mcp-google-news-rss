import { MCPToolManager, ToolContent } from "../core/toolManager.js";
import { NewsRssService } from "../services/newsRssService.js";
import { McpError, ErrorCode, Tool } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  InputSchema,
  SuccessOutputSchema,
  ExtractedNewsOutputSchema,
} from "../types/index.js";
import { UnifiedNewsExtractor } from "../extractors/unified-extractor.js";

export class ServerToolManager implements MCPToolManager {
  private newsRssService: NewsRssService;
  private unifiedExtractor: UnifiedNewsExtractor;
  private toolListChangedCallbacks: (() => void)[] = [];
  private tools: Tool[] = [];

  constructor(newsRssService: NewsRssService) {
    this.newsRssService = newsRssService;
    this.unifiedExtractor = new UnifiedNewsExtractor({
      timeout: 30000,
      maxRetries: 2,
    });
  }

  async initialize(): Promise<void> {
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
        inputSchema: zodToJsonSchema(InputSchema) as any,
      },
      {
        name: "searchAndExtractNews",
        description: `
        Google News에서 뉴스를 검색한 후 각 기사의 전체 내용과 원문 URL을 추출합니다.

- **hl**: ISO 639-1 언어 코드 (필수, 예: \`ko\` for Korean, \`en\` for English)
- **gl**: ISO 3166-1 alpha-2 국가 코드 (필수, 예: \`KR\` for Korea, \`US\` for United States)
- **keyword**: 검색 키워드 (선택사항)
- **count**: 추출할 최대 기사 수 (기본값: 5)


**Example:**

\`\`\`plaintext
Input:
  hl = 'ko'
  gl = 'KR'
  keyword = '인공지능'
  count = 3

Output:
  [
    {
      "title": "AI 기술의 새로운 발전",
      "link": "https://news.google.com/...",
      "sourceUrl": "https://www.actualnews.com/...",
      "content": "인공지능 기술이 새로운 단계로...",
      "author": "홍길동",
      "publishDate": "2025-01-08",
      "description": "AI 기술 발전에 대한 최신 소식"
    },
    ...
  ]
\`\`\`
        `,
        inputSchema: {
          type: "object",
          properties: {
            hl: {
              type: "string",
              description: "ISO 639-1 언어 코드 (필수)",
            },
            gl: {
              type: "string",
              description: "ISO 3166-1 alpha-2 국가 코드 (필수)",
            },
            keyword: {
              type: "string",
              description: "검색 키워드 (선택사항)",
            },
            count: {
              type: "number",
              description: "추출할 최대 기사 수",
              default: 5,
              minimum: 1,
              maximum: 20,
            },
          },
          required: ["hl", "gl"],
        } as any,
      },
      {
        name: "extractNewsContents",
        description: `
  주어진 뉴스 기사 링크 목록에서 각 기사의 전체 내용과 관련 정보를 추출합니다.

- **articles**: 추출할 기사 정보 배열. 각 객체는 다음을 포함해야 합니다:
  - **title**: 기사 제목 (문자열)
  - **link**: 기사 원문 링크 (문자열, 필수)
  - **pubDate**: 기사 발행일 (문자열)

**Example:**

\`\`\`plaintext
Input:
  articles: [
    { "title": "AI의 미래", "link": "https://some-news.com/ai-future", "pubDate": "2023-10-27" },
    { "title": "새로운 기술 동향", "link": "https://another-news.com/tech-trends", "pubDate": "2023-10-26" }
  ]

Output:
  [
    {
      "title": "AI의 미래",
      "link": "https://some-news.com/ai-future",
      "sourceUrl": "https://some-news.com/ai-future",
      "content": "인공지능은 우리 삶의 많은 부분을 바꾸고 있습니다...",
      "author": "김기자",
      "publishDate": "2023-10-27",
      "description": "AI가 미래에 미칠 영향에 대한 심층 분석",
      "extractionSuccess": true
    },
    ...
  ]
\`\`\`
        `,
        inputSchema: {
          type: "object",
          properties: {
            articles: {
              type: "array",
              description: "추출할 기사 정보 배열",
              items: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "기사 제목",
                  },
                  link: {
                    type: "string",
                    description: "기사 원문 링크",
                  },
                  pubDate: {
                    type: "string",
                    description: "기사 발행일",
                  },
                },
                required: ["link"],
              },
            },
          },
          required: ["articles"],
        } as any,
      },
    ];
  }

  async cleanup(): Promise<void> {
    // 추출기 리소스 정리
    try {
      if (this.unifiedExtractor) {
        await this.unifiedExtractor.closeAll();
        console.log("서버 종료 시 추출기 리소스 정리 완료");
      }
    } catch (error) {
      console.log("서버 종료 시 추출기 리소스 정리 중 오류:", error);
    }
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
    console.log("Executing tool:", name, params);

    if (name === "getGoogleNewsItems") {
      // params 유효성 검사
      const parsedInput = InputSchema.safeParse(params);
      if (!parsedInput.success) {
        throw new McpError(ErrorCode.InvalidParams, "Invalid input parameters");
      }

      const newsResult = await this.newsRssService.getNewsRss(parsedInput.data);
      // 'error' 속성의 존재 여부로 타입을 구분
      if ("error" in newsResult) {
        // 실패: ErrorOutputSchema 타입인 경우
        const toolContents: ToolContent[] = [
          {
            type: "text",
            text: `Error fetching news: ${newsResult.error}`,
          },
        ];
        return {
          content: toolContents,
          isError: true,
        };
      } else {
        // 성공: SuccessOutputSchema (아이템 배열) 타입인 경우
        const toolContents: ToolContent[] = [
          {
            type: "text",
            text: JSON.stringify(newsResult, null, 2),
          },
        ];
        return {
          content: toolContents,
          isError: false,
        };
      }
    }

    if (name === "searchAndExtractNews") {
      // 필수 매개변수 검증
      if (!params.hl || !params.gl) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "hl and gl are required parameters"
        );
      }

      // 기본값 설정
      const count = params.count || 5;

      try {
        // 1단계: Google News RSS에서 뉴스 목록 가져오기
        const newsParams = {
          hl: params.hl,
          gl: params.gl,
          keyword: params.keyword,
          count: count,
        };

        const parsedInput = InputSchema.safeParse(newsParams);
        if (!parsedInput.success) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid news search parameters"
          );
        }

        const newsResult = await this.newsRssService.getNewsRss(
          parsedInput.data
        );

        if ("error" in newsResult) {
          const toolContents: ToolContent[] = [
            {
              type: "text",
              text: `Error fetching news: ${newsResult.error}`,
            },
          ];
          return {
            content: toolContents,
            isError: true,
          };
        }

        // 2단계: 각 뉴스 기사의 내용 추출
        const extractedNews: any[] = [];

        // Promise.allSettled를 사용해 병렬 처리 및 실패 허용
        const extractionPromises = newsResult.map(async (newsItem, index) => {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Extraction timeout")), 45000); // 45초 전체 타임아웃
          });

          const extractionPromise = (async () => {
            try {
              console.log(`Extracting content from: ${newsItem.link}`);
              const extractedArticle = await this.unifiedExtractor.extract(
                newsItem.link
              );

              if (extractedArticle && extractedArticle.content) {
                return {
                  title: extractedArticle.title || newsItem.title,
                  link: newsItem.link,
                  sourceUrl: extractedArticle.sourceUrl,
                  content: extractedArticle.content,
                  author: extractedArticle.author,
                  publishDate: extractedArticle.publishDate || newsItem.pubDate,
                  description: extractedArticle.description,
                  extractionSuccess: true,
                };
              } else {
                return {
                  title: newsItem.title,
                  link: newsItem.link,
                  sourceUrl: newsItem.link,
                  content: "내용 추출에 실패했습니다.",
                  publishDate: newsItem.pubDate,
                  extractionSuccess: false,
                };
              }
            } catch (error) {
              console.log(
                `Error extracting content from ${newsItem.link}:`,
                error
              );
              return {
                title: newsItem.title,
                link: newsItem.link,
                sourceUrl: newsItem.link,
                content: `추출 오류: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                publishDate: newsItem.pubDate,
                extractionSuccess: false,
              };
            }
          })();

          return Promise.race([extractionPromise, timeoutPromise]);
        });

        // 모든 추출 작업을 병렬로 실행하되 실패해도 계속 진행
        const results = await Promise.allSettled(extractionPromises);

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            extractedNews.push(result.value);
          } else {
            // Promise가 reject된 경우에도 기본 정보 유지
            const newsItem = newsResult[index];
            extractedNews.push({
              title: newsItem.title,
              link: newsItem.link,
              sourceUrl: newsItem.link,
              content: `추출 실패: ${
                result.reason?.message || "Unknown error"
              }`,
              publishDate: newsItem.pubDate,
              extractionSuccess: false,
            });
          }
        });

        const toolContents: ToolContent[] = [
          {
            type: "text",
            text: JSON.stringify(extractedNews, null, 2),
          },
        ];

        return {
          content: toolContents,
          isError: false,
        };
      } catch (error) {
        console.error("Error in searchAndExtractNews:", error);
        const toolContents: ToolContent[] = [
          {
            type: "text",
            text: `Error in searchAndExtractNews: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ];
        return {
          content: toolContents,
          isError: true,
        };
      }
    }

    if (name === "extractNewsContents") {
      // params 유효성 검사
      if (!params.articles || !Array.isArray(params.articles)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "articles parameter is required and must be an array"
        );
      }

      const newsItems = params.articles as {
        title: string;
        link: string;
        pubDate: string;
      }[];

      const extractedNews: any[] = [];

      const extractionPromises = newsItems.map(async (newsItem) => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Extraction timeout")), 45000); // 45초 전체 타임아웃
        });

        const extractionPromise = (async () => {
          try {
            if (!newsItem.link) {
              return {
                title: newsItem.title || "제목 없음",
                link: newsItem.link || "링크 없음",
                content: "추출 오류: 기사 링크가 없습니다.",
                publishDate: newsItem.pubDate,
                extractionSuccess: false,
              };
            }
            console.log(`Extracting content from: ${newsItem.link}`);
            const extractedArticle = await this.unifiedExtractor.extract(
              newsItem.link
            );

            if (extractedArticle && extractedArticle.content) {
              return {
                title: extractedArticle.title || newsItem.title,
                link: newsItem.link,
                sourceUrl: extractedArticle.sourceUrl,
                content: extractedArticle.content,
                author: extractedArticle.author,
                publishDate: extractedArticle.publishDate || newsItem.pubDate,
                description: extractedArticle.description,
                extractionSuccess: true,
              };
            } else {
              return {
                title: newsItem.title,
                link: newsItem.link,
                sourceUrl: newsItem.link,
                content: "내용 추출에 실패했습니다.",
                publishDate: newsItem.pubDate,
                extractionSuccess: false,
              };
            }
          } catch (error) {
            console.log(
              `Error extracting content from ${newsItem.link}:`,
              error
            );
            return {
              title: newsItem.title,
              link: newsItem.link,
              sourceUrl: newsItem.link,
              content: `추출 오류: ${
                error instanceof Error ? error.message : String(error)
              }`,
              publishDate: newsItem.pubDate,
              extractionSuccess: false,
            };
          }
        })();

        return Promise.race([extractionPromise, timeoutPromise]);
      });

      const results = await Promise.allSettled(extractionPromises);

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          extractedNews.push(result.value);
        } else {
          const newsItem = newsItems[index];
          extractedNews.push({
            title: newsItem.title,
            link: newsItem.link,
            sourceUrl: newsItem.link,
            content: `추출 실패: ${result.reason?.message || "Unknown error"}`,
            publishDate: newsItem.pubDate,
            extractionSuccess: false,
          });
        }
      });

      const toolContents: ToolContent[] = [
        {
          type: "text",
          text: JSON.stringify(extractedNews, null, 2),
        },
      ];

      return {
        content: toolContents,
        isError: false,
      };
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  onToolListChanged(callback: () => void): void {
    this.toolListChangedCallbacks.push(callback);
  }

  private notifyToolListChanged(): void {
    for (const callback of this.toolListChangedCallbacks) {
      callback();
    }
  }
}
