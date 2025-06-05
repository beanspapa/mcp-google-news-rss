import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";

async function testContentExtraction() {
  try {
    console.log("=== Content Extraction Test ===");
    
    // 클라이언트 생성
    const client = new Client({
      name: "extract-test-client",
      version: "1.0.0",
    });

    const serverConfig = {
      command: "node",
      script: "dist/server.js"
    };

    // 연결
    const transport = new StdioClientTransport({
      command: serverConfig.command,
      args: [serverConfig.script]
    });
    await client.connect(transport);
    console.log("Connected to MCP server");

    // 타임아웃을 위한 Promise wrapper
    const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout after ${timeoutMs}ms`));
        }, timeoutMs);

        promise
          .then(resolve)
          .catch(reject)
          .finally(() => clearTimeout(timer));
      });
    };

    // 내용 추출 테스트 (30초 타임아웃)
    console.log("Starting content extraction test with 30s timeout...");
    const startTime = Date.now();
    
    const extractedContentResult = await withTimeout(
      client.request(
        {
          method: "tools/call",
          params: {
            name: "searchAndExtractNews",
            arguments: {
              hl: "ko",
              gl: "KR",
              count: 1,
              keyword: "AI",

            },
          },
        },
        z.object({
          content: z.array(
            z.object({
              type: z.string(),
              text: z.string(),
            })
          ),
        })
      ),
      30000 // 30초 타임아웃
    );

    const endTime = Date.now();
    console.log(`Content extraction completed in ${endTime - startTime}ms`);
    console.log("Result:", extractedContentResult);

    // 연결 닫기
    await client.close();
    console.log("Test completed successfully");
    
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
}

// 테스트 실행
testContentExtraction()
  .then(() => {
    console.log("Content extraction test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Content extraction test failed:", error);
    process.exit(1);
  }); 