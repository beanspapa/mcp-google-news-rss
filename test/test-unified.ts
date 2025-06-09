import { UnifiedNewsExtractor } from "../src/extractors/unified-extractor.js";

interface TestCase {
  name: string;
  url: string;
  expectedExtractor: string;
}

interface TestOptions {
  forcePlaywright?: boolean;
  showFullContent?: boolean;
  verbose?: boolean;
}

async function testUnifiedExtractor(): Promise<void> {
  console.log("🎯 통합 뉴스 추출기 테스트 시작\n");

  const extractor = new UnifiedNewsExtractor();

  const testCases: TestCase[] = [
    {
      name: "네이버 뉴스 (자동 감지)",
      url: "https://n.news.naver.com/mnews/article/469/0000867874",
      expectedExtractor: "Naver News Specialized",
    },
    {
      name: "BBC News (범용 추출기)",
      url: "https://www.bbc.com/news/articles/c3e50g0vzl5o",
      expectedExtractor: "General News Extractor",
    },
    {
      name: "TechCrunch (범용 추출기)",
      url: "https://techcrunch.com/2025/05/31/week-in-review-perplexity-labs-wants-to-do-your-work/",
      expectedExtractor: "General News Extractor",
    },
    {
      name: "구글 뉴스 (리다이렉트 추출기)",
      url: "https://news.google.com/read/CBMiVkFVX3lxTE5najlfcFY2ZzBfNHBiWlpTNUV5a185UnM5eG1WVExJQndWaVk3VHotdWc1dUhmWVFtaDg3bVVfVTFZU2FqSEplUDN1UWI1RjE0S244a0R30gFXQVVfeXFMTnNyTnVSblZPcHNmVEM0d2R4VWhBQjItRGE4VGROUnlKS2NMN3RfbHV3R1VWQXlZQmpFb3pGZE1aYTFhSVFSU3JhMDZsMmlMSVhEUHNNRXRn?hl=ko&gl=KR&ceid=KR%3Ako",
      expectedExtractor: "Google News Redirect",
    },
  ];

  let successCount = 0;
  let totalTime = 0;

  console.log("📋 지원하는 사이트 목록:");
  console.log("  전용 추출기: naver.com");
  console.log("  범용 지원: 일반 웹사이트");
  console.log("");

  for (const testCase of testCases) {
    console.log(`📰 테스트: ${testCase.name}`);
    console.log(`🔗 URL: ${testCase.url}`);

    try {
      const startTime = Date.now();
      const result = await extractor.extract(testCase.url);
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (!result) {
        console.log(`❌ 결과가 null입니다.\n`);
        continue;
      }

      console.log(`✅ 성공!`);
      console.log(`🔗 원문 URL: ${result.sourceUrl || "정보 없음"}`);
      console.log(
        `🎯 감지된 사이트: ${result.unified?.detectedSite || "정보 없음"}`
      );
      console.log(
        `🔧 사용된 추출기: ${result.unified?.extractorUsed || "정보 없음"}`
      );
      console.log(`⏱️  소요시간: ${duration}ms`);
      console.log(
        `📝 통계: ${result.stats?.words || 0}단어, ${
          result.stats?.sentences || 0
        }문장`
      );
      console.log(
        `📝 제목: ${result.title.substring(0, 80)}${
          result.title.length > 80 ? "..." : ""
        }`
      );
      console.log(`👤 작성자: ${result.author || "정보 없음"}`);
      console.log(`📅 발행일: ${result.publishDate || "정보 없음"}`);
      console.log(`📄 내용길이: ${result.content.length}자`);

      // 예상 추출기와 실제 사용된 추출기 비교
      if (result.unified?.extractorUsed?.includes(testCase.expectedExtractor)) {
        console.log(`🎯 추출기 매칭: 예상과 일치 ✅`);
      } else {
        console.log(
          `⚠️ 추출기 매칭: 예상 "${testCase.expectedExtractor}" ≠ 실제 "${
            result.unified?.extractorUsed || "정보 없음"
          }"`
        );
      }

      if (result.content.length > 0) {
        console.log(`📖 내용 미리보기: ${result.content.substring(0, 150)}...`);
      } else {
        console.log("⚠️ 내용이 추출되지 않았습니다.");
      }

      successCount++;
      totalTime += duration;
      console.log("\n");
    } catch (error: any) {
      console.log(`❌ 실패: ${error.message}\n`);
    }
  }

  await extractor.closeAll();

  // 최종 결과 요약
  console.log("=".repeat(60));
  console.log("🏁 통합 추출기 테스트 결과");
  console.log(`✅ 성공: ${successCount}/${testCases.length}개`);
  if (successCount > 0) {
    console.log(`⏱️ 평균 소요시간: ${Math.round(totalTime / successCount)}ms`);
  }
  console.log(
    `📈 성공률: ${Math.round((successCount / testCases.length) * 100)}%`
  );
  console.log("=".repeat(60));
}

// 단일 URL 테스트 함수
async function testSingleUrl(
  url: string,
  options: TestOptions = {}
): Promise<void> {
  console.log(`🎯 통합 추출기 단일 URL 테스트: ${url}\n`);

  const extractor = new UnifiedNewsExtractor();

  try {
    const result = await extractor.extract(url, options);

    if (!result) {
      console.log(`❌ 결과가 null입니다.`);
      return;
    }

    console.log("✅ 추출 성공!");
    console.log("\n🎯 통합 정보:");
    console.log(`🔗 원문 URL: ${result.sourceUrl || "정보 없음"}`);
    console.log(
      `  🔍 감지된 사이트: ${result.unified?.detectedSite || "정보 없음"}`
    );
    console.log(
      `  🔧 사용된 추출기: ${result.unified?.extractorUsed || "정보 없음"}`
    );
    console.log(
      `  ⏱️ 총 소요시간: ${result.unified?.totalExtractionTime || 0}ms`
    );
    if (result.unified?.fallbackReason) {
      console.log(`  🔄 폴백 사유: ${result.unified.fallbackReason}`);
    }

    console.log("\n📊 기사 정보:");
    console.log(`  📝 제목: ${result.title}`);
    console.log(`  👤 작성자: ${result.author || "정보 없음"}`);
    console.log(`  📅 발행일: ${result.publishDate || "정보 없음"}`);
    console.log(
      `  🔧 추출방법: ${
        result.metadata?.extractionMethod ||
        result.unified?.extractorUsed ||
        "정보 없음"
      }`
    );

    console.log("\n📈 상세 통계:");
    console.log(
      `  📄 총 글자수: ${result.stats?.characters?.toLocaleString() || 0}자`
    );
    console.log(
      `  🔤 공백제외: ${
        result.stats?.charactersNoSpaces?.toLocaleString() || 0
      }자`
    );
    console.log(`  📝 단어수: ${result.stats?.words?.toLocaleString() || 0}개`);
    console.log(`  📋 문장수: ${result.stats?.sentences || 0}개`);
    console.log(`  📄 문단수: ${result.stats?.paragraphs || 0}개`);
    console.log(`  ⏰ 읽기시간: 약 ${result.stats?.readingTimeMinutes || 0}분`);

    if (result.description) {
      console.log(`\n📄 기사 요약:`);
      console.log(`  ${result.description}`);
    }

    // 전체 내용 출력 (옵션)
    if (options.showFullContent && result.content.length > 0) {
      console.log("\n📖 전체 기사 내용:");
      console.log("=".repeat(80));
      console.log(result.content);
      console.log("=".repeat(80));
    } else if (result.content.length > 0) {
      console.log(`\n📖 내용 미리보기: ${result.content.substring(0, 200)}...`);
    } else {
      console.log("\n⚠️ 내용이 추출되지 않았습니다.");
    }
  } catch (error: any) {
    console.log(`❌ 실패: ${error.message}`);
    console.log("\n🔧 해결 방법:");
    console.log("  - URL이 올바른지 확인");
    console.log("  - --playwright 옵션으로 재시도");
    console.log("  - 네트워크 연결 상태 확인");
  } finally {
    await extractor.closeAll();
  }
}

// 배치 테스트 함수
async function testBatchExtraction(): Promise<void> {
  console.log("📦 배치 추출 테스트 시작\n");

  const extractor = new UnifiedNewsExtractor();

  const urls = [
    "https://n.news.naver.com/mnews/article/469/0000867874",
    "https://www.bbc.com/news/articles/c3e50g0vzl5o",
    "https://techcrunch.com/2025/05/31/week-in-review-perplexity-labs-wants-to-do-your-work/",
    "https://news.google.com/read/CBMiVkFVX3lxTE5UWU9YOWtNNGpMWG1fUEQ2dXQ0X1JENW1ib0NfLVluU3FQYmlwS0tReHpNQnRvc0hCdUN5Yk1wU2ZqNV9OLTNfeERIeXF5LTdaVWJLUmN3?hl=ko&gl=KR&ceid=KR%3Ako",
  ];

  try {
    const { results, errors } = await extractor.extractBatch(urls, {
      concurrency: 2,
    });

    const successCount = results.filter((r) => r !== null).length;
    const totalCount = urls.length;

    console.log("📊 배치 추출 결과:");
    console.log(`  총 ${totalCount}개 URL 처리`);
    console.log(`  성공: ${successCount}개`);
    console.log(`  실패: ${errors.length}개`);
    console.log(`  성공률: ${Math.round((successCount / totalCount) * 100)}%`);
    console.log("");

    // 성공한 추출 결과들
    results.forEach((result, index) => {
      if (result) {
        console.log(`✅ 성공 ${index + 1}: ${urls[index]}`);
        console.log(
          `   추출기: ${result.unified?.extractorUsed || "정보 없음"}`
        );
        console.log(`   내용: ${result.content.length}자`);
      }
    });

    // 실패한 추출들
    errors.forEach((item, index) => {
      console.log(`❌ 실패 ${index + 1}: ${item.url}`);
      console.log(`   오류: ${item.error}`);
    });
  } catch (error: any) {
    console.log(`❌ 배치 처리 실패: ${error.message}`);
  } finally {
    await extractor.closeAll();
  }
}

// 명령행 인수 처리
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await testUnifiedExtractor();
    return;
  }

  const command = args[0];

  if (command === "--batch") {
    await testBatchExtraction();
  } else if (command.startsWith("http")) {
    // URL이 제공된 경우
    const url = command;
    const options: TestOptions = {
      forcePlaywright: args.includes("--playwright"),
      showFullContent: args.includes("--full"),
      verbose: args.includes("--verbose"),
    };
    await testSingleUrl(url, options);
  } else {
    console.log("사용법:");
    console.log(
      "  node --loader ts-node/esm test/test-unified.ts                    # 기본 테스트"
    );
    console.log(
      "  node --loader ts-node/esm test/test-unified.ts [URL]              # 단일 URL 테스트"
    );
    console.log(
      "  node --loader ts-node/esm test/test-unified.ts [URL] --full       # 전체 내용 포함"
    );
    console.log(
      "  node --loader ts-node/esm test/test-unified.ts [URL] --playwright  # Playwright 강제"
    );
    console.log(
      "  node --loader ts-node/esm test/test-unified.ts [URL] --verbose    # 상세 로그 출력"
    );
    console.log(
      "  node --loader ts-node/esm test/test-unified.ts --batch            # 배치 테스트"
    );
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { testUnifiedExtractor, testSingleUrl, testBatchExtraction };
