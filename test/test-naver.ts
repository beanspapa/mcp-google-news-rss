import { NaverNewsExtractor } from "../src/extractors/naver-extractor.js";

async function testNaverExtractor(): Promise<void> {
  console.log("🔵 네이버 뉴스 전용 추출기 테스트 시작\n");

  const extractor = new NaverNewsExtractor();

  const testUrls = [
    "https://n.news.naver.com/mnews/article/469/0000867874",
    "https://news.naver.com/main/read.naver?mode=LSD&mid=sec&sid1=001&oid=001&aid=0014917856",
    "https://n.news.naver.com/mnews/article/001/0014917856",
    "https://news.naver.com/breakingnews/section/105/230",
  ];

  let successCount = 0;
  let totalTime = 0;

  for (const [index, url] of testUrls.entries()) {
    console.log(`📰 테스트 ${index + 1}/${testUrls.length}`);
    console.log(`🔗 URL: ${url}`);

    try {
      const startTime = Date.now();
      const result = await extractor.extract(url);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ 성공!`);
      console.log(`⏱️ 소요시간: ${duration}ms`);
      console.log(`🔧 추출방법: ${result.performance?.method || "정보 없음"}`);
      console.log(
        `📊 통계: ${result.stats?.words || 0}단어, ${
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

      if (result.metadata?.oid && result.metadata?.aid) {
        console.log(
          `🆔 네이버 ID: oid=${result.metadata.oid}, aid=${result.metadata.aid}`
        );
      }

      if (result.metadata?.naverSpecific?.category) {
        console.log(`📂 카테고리: ${result.metadata.naverSpecific.category}`);
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

  // 최종 결과 요약
  console.log("=".repeat(60));
  console.log("🏁 네이버 뉴스 추출기 테스트 결과");
  console.log(`✅ 성공: ${successCount}/${testUrls.length}개`);
  if (successCount > 0) {
    console.log(`⏱️ 평균 소요시간: ${Math.round(totalTime / successCount)}ms`);
  }
  console.log(
    `📈 성공률: ${Math.round((successCount / testUrls.length) * 100)}%`
  );
  console.log("=".repeat(60));
}

// 단일 URL 테스트
async function testSingleNaverUrl(url: string): Promise<void> {
  console.log(`🔵 네이버 뉴스 단일 URL 테스트: ${url}\n`);

  const extractor = new NaverNewsExtractor();

  try {
    const result = await extractor.extract(url);

    console.log("✅ 추출 성공!");
    console.log("\n📊 기사 정보:");
    console.log(`  📝 제목: ${result.title}`);
    console.log(`  👤 작성자: ${result.author || "정보 없음"}`);
    console.log(`  📅 발행일: ${result.publishDate || "정보 없음"}`);
    console.log(`  🔧 추출방법: ${result.performance?.method || "정보 없음"}`);
    console.log(`  ⏱️ 소요시간: ${result.performance?.extractionTime || 0}ms`);

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

    console.log("\n🔍 네이버 메타데이터:");
    console.log(`  🌐 도메인: ${result.metadata?.domain || "정보 없음"}`);
    console.log(`  🔤 언어: ${result.metadata?.language || "정보 없음"}`);
    console.log(`  🆔 OID: ${result.metadata?.oid || "없음"}`);
    console.log(`  🆔 AID: ${result.metadata?.aid || "없음"}`);
    console.log(
      `  📂 카테고리: ${result.metadata?.naverSpecific?.category || "없음"}`
    );
    console.log(`  🧮 총 요소수: ${result.metadata?.totalElements || 0}`);

    if (result.description) {
      console.log(`\n📄 기사 요약:`);
      console.log(`  ${result.description}`);
    }

    console.log(`\n📖 내용 미리보기:`);
    console.log(`  ${result.content.substring(0, 300)}...`);
  } catch (error: any) {
    console.log(`❌ 실패: ${error.message}`);
  }
}

// 명령행 인수 처리
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await testNaverExtractor();
    return;
  }

  const url = args[0];
  if (url.startsWith("http")) {
    await testSingleNaverUrl(url);
  } else {
    console.log("사용법:");
    console.log(
      "  node --loader ts-node/esm test/test-naver.ts        # 기본 테스트"
    );
    console.log(
      "  node --loader ts-node/esm test/test-naver.ts [URL]  # 단일 URL 테스트"
    );
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { testNaverExtractor, testSingleNaverUrl };
