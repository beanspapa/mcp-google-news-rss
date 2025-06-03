import { NewsRssService } from "../src/services/newsRssService.js";
import { Input } from "../src/types/index.js";

async function testRssService(): Promise<void> {
  console.log("📰 구글 뉴스 RSS 서비스 테스트 시작\n");

  const service = new NewsRssService();

  const testCases: Input[] = [
    {
      gl: "KR",
      hl: "ko",
      count: 5,
    },
    {
      gl: "US",
      hl: "en",
      keyword: "technology",
      count: 3,
    },
    {
      gl: "JP",
      hl: "ja",
      keyword: "AI",
      count: 5,
    },
    {
      gl: "KR",
      hl: "ko",
      keyword: "삼성전자",
      count: 5,
    },
  ];

  let successCount = 0;
  let totalTime = 0;

  for (const [index, testCase] of testCases.entries()) {
    console.log(`📰 테스트 ${index + 1}/${testCases.length}`);
    console.log(`🌐 국가: ${testCase.gl}, 언어: ${testCase.hl}`);
    if (testCase.keyword) {
      console.log(`🔍 키워드: ${testCase.keyword}`);
    }
    console.log(`📊 요청 개수: ${testCase.count || "전체"}`);

    try {
      const startTime = Date.now();
      const result = await service.getNewsRss(testCase);
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (Array.isArray(result)) {
        console.log(`✅ 성공! ${result.length}개 기사 조회`);

        result.slice(0, 3).forEach((item, idx) => {
          console.log(
            `  ${idx + 1}. ${item.title.substring(0, 50)}${
              item.title.length > 50 ? "..." : ""
            }`
          );
          console.log(`     🔗 ${item.link}`);
        });

        if (result.length > 3) {
          console.log(`     ... 외 ${result.length - 3}개 더`);
        }
      } else if ("error" in result) {
        console.log(`✅ 예상된 에러 발생: ${result.error}`);
        continue;
      }

      successCount++;
      totalTime += duration;
      console.log(`⏱️ 소요시간: ${duration}ms\n`);
    } catch (error: any) {
      console.log(`❌ 실패: ${error.message}\n`);
    }
  }

  // 최종 결과 요약
  console.log("=".repeat(60));
  console.log("🏁 RSS 서비스 테스트 결과");
  console.log(`✅ 성공: ${successCount}/${testCases.length}개`);
  if (successCount > 0) {
    console.log(`⏱️ 평균 소요시간: ${Math.round(totalTime / successCount)}ms`);
  }
  console.log(
    `📈 성공률: ${Math.round((successCount / testCases.length) * 100)}%`
  );
  console.log("=".repeat(60));
}

// 에러 케이스 테스트
async function testErrorCases(): Promise<void> {
  console.log("❌ RSS 서비스 에러 케이스 테스트 시작\n");

  const service = new NewsRssService();

  const errorCases: Input[] = [
    {
      gl: "INVALID",
      hl: "ko",
      count: 5,
    },
    {
      gl: "KR",
      hl: "invalid",
      count: 5,
    },
    {
      gl: "KR",
      hl: "ko",
      count: -1,
    },
  ];

  for (const [index, testCase] of errorCases.entries()) {
    console.log(`🔍 에러 테스트 ${index + 1}/${errorCases.length}`);
    console.log(
      `  입력: gl=${testCase.gl}, hl=${testCase.hl}, count=${testCase.count}`
    );

    try {
      const result = await service.getNewsRss(testCase);

      if ("error" in result) {
        console.log(`✅ 예상된 에러 발생: ${result.error}`);
      } else {
        console.log(`⚠️ 에러가 발생하지 않음 (예상과 다름)`);
      }
    } catch (error: any) {
      console.log(`✅ 예상된 예외 발생: ${error.message}`);
    }
    console.log("");
  }
}

// 단일 케이스 테스트
async function testSingleCase(
  gl: string,
  hl: string,
  keyword?: string,
  count?: number
): Promise<void> {
  console.log(`📰 RSS 서비스 단일 테스트`);
  console.log(`🌐 국가: ${gl}, 언어: ${hl}`);
  if (keyword) console.log(`🔍 키워드: ${keyword}`);
  if (count) console.log(`📊 요청 개수: ${count}`);
  console.log("");

  const service = new NewsRssService();
  const input: Input = { gl, hl, keyword, count };

  try {
    const startTime = Date.now();
    const result = await service.getNewsRss(input);
    const endTime = Date.now();
    const duration = endTime - startTime;

    if (Array.isArray(result)) {
      console.log(`✅ 성공! ${result.length}개 기사 조회`);
      console.log(`⏱️ 소요시간: ${duration}ms\n`);

      console.log("📋 상위 10개 기사:");
      result.slice(0, 10).forEach((item, idx) => {
        console.log(`${String(idx + 1).padStart(2, " ")}. ${item.title}`);
        console.log(`    🔗 ${item.link}\n`);
      });
    } else if ("error" in result) {
      console.log(`❌ 에러: ${result.error}`);
    }
  } catch (error: any) {
    console.log(`❌ 실패: ${error.message}`);
  }
}

// 언어별 테스트
async function testLanguages(): Promise<void> {
  console.log("🌐 다양한 언어별 RSS 테스트 시작\n");

  const service = new NewsRssService();

  const languageTests = [
    { gl: "KR", hl: "ko", name: "한국어" },
    { gl: "US", hl: "en", name: "영어" },
    { gl: "JP", hl: "ja", name: "일본어" },
    { gl: "CN", hl: "zh-Hans", name: "중국어(간체)" },
    { gl: "FR", hl: "fr", name: "프랑스어" },
    { gl: "DE", hl: "de", name: "독일어" },
  ];

  for (const test of languageTests) {
    console.log(`🌍 ${test.name} 테스트 (${test.gl}/${test.hl})`);

    try {
      const result = await service.getNewsRss({
        gl: test.gl,
        hl: test.hl,
        count: 3,
      });

      if (Array.isArray(result)) {
        console.log(`✅ 성공! ${result.length}개 기사`);
        if (result.length > 0) {
          console.log(`   예시: ${result[0].title.substring(0, 60)}...`);
        }
      } else if ("error" in result) {
        console.log(`❌ 에러: ${result.error}`);
      }
    } catch (error: any) {
      console.log(`❌ 실패: ${error.message}`);
    }
    console.log("");
  }
}

// 명령행 인수 처리
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await testRssService();
    return;
  }

  const command = args[0];

  switch (command) {
    case "--errors":
      await testErrorCases();
      break;
    case "--languages":
      await testLanguages();
      break;
    case "--single":
      if (args.length < 3) {
        console.log("사용법: --single [국가코드] [언어코드] [키워드?] [개수?]");
        return;
      }
      const gl = args[1];
      const hl = args[2];
      const keyword = args[3];
      const count = args[4] ? parseInt(args[4]) : undefined;
      await testSingleCase(gl, hl, keyword, count);
      break;
    default:
      console.log("사용법:");
      console.log(
        "  node --loader ts-node/esm test/test-rss-service.ts                              # 기본 테스트"
      );
      console.log(
        "  node --loader ts-node/esm test/test-rss-service.ts --errors                     # 에러 케이스 테스트"
      );
      console.log(
        "  node --loader ts-node/esm test/test-rss-service.ts --languages                  # 언어별 테스트"
      );
      console.log(
        "  node --loader ts-node/esm test/test-rss-service.ts --single KR ko [키워드] [개수] # 단일 테스트"
      );
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { testRssService, testErrorCases, testSingleCase, testLanguages };
