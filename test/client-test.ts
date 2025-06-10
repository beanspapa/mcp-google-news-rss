import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";

async function testMCPServer() {
  try {
    // 클라이언트 생성
    const client = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    // --- 가상 설정 정의 (원래는 외부 파일이나 설정에서 읽어옴) ---
    const serverConfig = {
      // 사용자가 제공한 예시와 유사하게 구성
      command: "node", // 실행할 명령어
      script: "dist/server.js", // 실행할 스크립트
    };

    // ----------------------------------------------------------

    // Stdio 전송 계층 생성 및 연결 (수정됨)
    const transport = new StdioClientTransport({
      command: serverConfig.command, // "node"
      args: [serverConfig.script], // 구성된 인수 배열 사용
    });
    await client.connect(transport);
    console.log("Connected to MCP server");

    // 1. 서버 정보 조회
    console.log("\n=== Testing Server Info ===");
    const infoResponse = await client.request(
      {
        method: "server/info",
      },
      z.object({
        name: z.string(),
        version: z.string(),
      })
    );
    console.log("Server Info:", infoResponse);

    // 2. 가용한 도구 목록 조회
    console.log("\n=== Testing Available Tools ===");
    const toolsResponse = await client.request(
      {
        method: "tools/list",
      },
      z.object({
        tools: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
          })
        ),
      })
    );
    console.log("Available Tools:", toolsResponse);

    // 3. getGoogleNewsItems 도구 실행 테스트
    console.log("\n=== Testing getGoogleNewsItems Tool ===");
    const newsResult = await client.request(
      {
        method: "tools/call",
        params: {
          name: "getGoogleNewsItems",
          arguments: {
            hl: "ko",
            gl: "KR",
            count: 10, // 테스트를 위해 10개로 늘립니다.
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
    );
    console.log("News List:", newsResult.content[0].text);

    // 4. extractNewsContents 도구 테스트 (getGoogleNewsItems 결과 사용)
    console.log("\n=== Testing extractNewsContents Tool ===");
    const articlesToExtract = JSON.parse(newsResult.content[0].text);

    if (Array.isArray(articlesToExtract) && articlesToExtract.length > 0) {
      const extractedContentsResult = await client.request(
        {
          method: "tools/call",
          params: {
            name: "extractNewsContents",
            arguments: {
              articles: articlesToExtract,
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
      );
      console.log(
        "Extracted Contents:",
        extractedContentsResult.content[0].text
      );
    } else {
      console.log(
        "No articles found from getGoogleNewsItems to test extractNewsContents."
      );
    }

    // 5. searchAndExtractNews 도구 테스트
    console.log("\n=== Testing searchAndExtractNews Tool ===");
    const extractedNewsResult = await client.request(
      {
        method: "tools/call",
        params: {
          name: "searchAndExtractNews",
          arguments: {
            hl: "ko",
            gl: "KR",
            keyword: "자율주행",
            count: 5, // 테스트를 위해 5개로 늘립니다.
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
    );
    console.log(
      "Search and Extracted News:",
      extractedNewsResult.content[0].text
    );

    // 연결 닫기
    await client.close();
    console.log("\nMCP client disconnected");
  } catch (error) {
    console.error("Error in testMCPServer:", error);
    throw error;
  }
}

// 테스트 실행
testMCPServer()
  .then(() => {
    console.log("Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
