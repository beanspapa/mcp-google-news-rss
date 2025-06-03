import { testRssService } from "./test-rss-service.js";
import { testNaverExtractor } from "./test-naver.js";
import { testUnifiedExtractor } from "./test-unified.js";

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration: number;
}

async function runTest(
  testName: string,
  testFn: () => Promise<void>
): Promise<TestResult> {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🧪 ${testName} 테스트 시작`);
  console.log(`${"=".repeat(80)}\n`);

  const startTime = Date.now();

  try {
    await testFn();
    const duration = Date.now() - startTime;

    console.log(`\n✅ ${testName} 테스트 완료 (${duration}ms)`);
    return {
      name: testName,
      success: true,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.log(
      `\n❌ ${testName} 테스트 실패: ${error.message} (${duration}ms)`
    );
    return {
      name: testName,
      success: false,
      error: error.message,
      duration,
    };
  }
}

async function runAllTests(): Promise<void> {
  console.log("🚀 전체 테스트 스위트 시작\n");
  console.log("📝 테스트 목록:");
  console.log("  1. RSS 서비스 테스트");
  console.log("  2. 네이버 뉴스 추출기 테스트");
  console.log("  3. 통합 뉴스 추출기 테스트");
  console.log("");

  const allStartTime = Date.now();
  const results: TestResult[] = [];

  // 각 테스트 실행
  const tests = [
    { name: "RSS 서비스", fn: testRssService },
    { name: "네이버 뉴스 추출기", fn: testNaverExtractor },
    { name: "통합 뉴스 추출기", fn: testUnifiedExtractor },
  ];

  for (const test of tests) {
    const result = await runTest(test.name, test.fn);
    results.push(result);

    // 테스트 간 간격
    if (test !== tests[tests.length - 1]) {
      console.log(`\n⏳ 다음 테스트까지 3초 대기...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  const allEndTime = Date.now();
  const totalDuration = allEndTime - allStartTime;

  // 최종 결과 요약
  console.log(`\n${"=".repeat(80)}`);
  console.log("🏁 전체 테스트 결과 요약");
  console.log(`${"=".repeat(80)}`);

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`📊 총 테스트: ${results.length}개`);
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(
    `📈 성공률: ${Math.round((successCount / results.length) * 100)}%`
  );
  console.log(`⏱️ 총 소요시간: ${Math.round(totalDuration / 1000)}초`);
  console.log("");

  console.log("📋 상세 결과:");
  results.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    const duration = `(${Math.round(result.duration / 1000)}초)`;
    console.log(`  ${index + 1}. ${status} ${result.name} ${duration}`);
    if (result.error) {
      console.log(`      💬 에러: ${result.error}`);
    }
  });

  if (failCount > 0) {
    console.log("\n⚠️ 실패한 테스트가 있습니다. 개별적으로 다시 실행해보세요:");
    results
      .filter((r) => !r.success)
      .forEach((result) => {
        const testFile = result.name.includes("RSS")
          ? "test-rss-service.ts"
          : result.name.includes("네이버")
          ? "test-naver.ts"
          : "test-unified.ts";
        console.log(`   npx tsx test/${testFile}`);
      });
  } else {
    console.log("\n🎉 모든 테스트가 성공적으로 완료되었습니다!");
  }

  console.log(`\n${"=".repeat(80)}`);
}

// 빠른 테스트 (간소화된 버전)
async function runQuickTests(): Promise<void> {
  console.log("⚡ 빠른 테스트 스위트 시작\n");

  const quickTests = [
    {
      name: "RSS 서비스 기본 테스트",
      fn: async () => {
        const { NewsRssService } = await import(
          "../src/services/newsRssService.js"
        );
        const service = new NewsRssService();
        const result = await service.getNewsRss({
          gl: "KR",
          hl: "ko",
          count: 1,
        });
        if (Array.isArray(result) && result.length > 0) {
          console.log(
            `✅ RSS 서비스 작동 확인: ${result[0].title.substring(0, 50)}...`
          );
        } else {
          throw new Error("RSS 서비스에서 데이터를 가져올 수 없습니다");
        }
      },
    },
    {
      name: "네이버 추출기 기본 테스트",
      fn: async () => {
        const { NaverNewsExtractor } = await import(
          "../src/extractors/naver-extractor.js"
        );
        const extractor = new NaverNewsExtractor();
        // 빠른 테스트용 샘플 URL 대신 클래스만 인스턴스화
        console.log("✅ 네이버 추출기 클래스 로딩 확인");
      },
    },
  ];

  for (const test of quickTests) {
    try {
      await test.fn();
      console.log(`✅ ${test.name} 통과`);
    } catch (error: any) {
      console.log(`❌ ${test.name} 실패: ${error.message}`);
    }
  }

  console.log("\n⚡ 빠른 테스트 완료");
}

// 명령행 인수 처리
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await runAllTests();
    return;
  }

  const command = args[0];

  switch (command) {
    case "--quick":
      await runQuickTests();
      break;
    case "--help":
      console.log("사용법:");
      console.log(
        "  node --loader ts-node/esm test/run-all-tests.ts         # 전체 테스트 실행"
      );
      console.log(
        "  node --loader ts-node/esm test/run-all-tests.ts --quick # 빠른 테스트 실행"
      );
      console.log(
        "  node --loader ts-node/esm test/run-all-tests.ts --help  # 도움말 표시"
      );
      break;
    default:
      console.log("알 수 없는 명령어입니다. --help로 사용법을 확인하세요.");
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { runAllTests, runQuickTests };
