import { NewsContentExtractorService } from "../src/services/newsContentExtractorService.js";
import { NewsRssService } from "../src/services/newsRssService.js";
import { NewsContentInput } from "../src/services/newsContentExtractorService.js";

async function runTest() {
  console.log("🚀 기사 본문 추출 테스트를 시작합니다...");

  // 1단계: NewsRssService를 사용해 구글 뉴스에서 기사 목록 가져오기
  const rssService = new NewsRssService();
  const newsItems = await rssService.getNewsRss({
    hl: "ko",
    gl: "KR",
    keyword: "인공지능",
    count: 2, // 테스트를 위해 2개만 가져옵니다.
  });

  if ("error" in newsItems) {
    console.error("💥 RSS 피드를 가져오는 중 오류 발생:", newsItems.error);
    return;
  }

  if (newsItems.length === 0) {
    console.log(" RSS 피드에서 가져올 뉴스가 없습니다. 테스트를 종료합니다.");
    return;
  }

  console.log(
    `📰 ${newsItems.length}개의 기사 목록을 성공적으로 가져왔습니다.`
  );
  console.log("--------------------------------------------------");

  // 2단계: 가져온 기사 목록을 NewsContentExtractorService에 전달하여 본문 추출
  const contentExtractor = new NewsContentExtractorService();

  // 타입 변환: getNewsRss의 결과를 extractContents의 입력 타입으로 매핑
  const extractorInput: NewsContentInput[] = newsItems.map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
  }));

  console.log("📝 본문 추출을 시작합니다...");
  const extractedContents = await contentExtractor.extractContents(
    extractorInput
  );

  console.log("--------------------------------------------------");
  console.log("✅ 테스트 완료. 최종 결과:");
  console.log(JSON.stringify(extractedContents, null, 2));
}

runTest().catch((error) => {
  console.error("💥 테스트 실행 중 심각한 오류 발생:", error);
});
