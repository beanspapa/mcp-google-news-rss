import { UnifiedNewsExtractor } from "./unified-extractor.js";
import { NaverNewsExtractor } from "./naver-extractor.js";
import { GeneralNewsExtractor } from "./general-extractor.js";
import { GoogleNewsRedirectExtractor } from "./google-news-extractor.js";
import { UnifiedExtractedArticle } from "./types.js";

// 메인 통합 추출기 (권장)
export const createExtractor = (): UnifiedNewsExtractor => {
  return new UnifiedNewsExtractor();
};

// 간편한 추출 함수
export const extract = async (
  url: string,
  options: any = {}
): Promise<UnifiedExtractedArticle | null> => {
  const extractor = createExtractor();
  try {
    const result = await extractor.extract(url, options);
    await extractor.closeAll();
    return result;
  } catch (error) {
    await extractor.closeAll();
    throw error;
  }
};

// 배치 추출 함수
export const extractBatch = async (
  urls: string[],
  options: any = {}
): Promise<{ results: (UnifiedExtractedArticle | null)[]; errors: any[] }> => {
  const extractor = createExtractor();
  try {
    const results = await extractor.extractBatch(urls, options);
    await extractor.closeAll();
    return results;
  } catch (error) {
    await extractor.closeAll();
    throw error;
  }
};

// 지원 사이트 목록 조회
export const getSupportedSites = (): string[] => {
  // UnifiedNewsExtractor가 지원하는 주요 사이트들
  return [
    "naver.com",
    "news.naver.com", 
    "google.com",
    "news.google.com",
    "기타 일반 뉴스 사이트"
  ];
};

// 개별 추출기들 (고급 사용자용)
export const extractors = {
  unified: UnifiedNewsExtractor,
  naver: NaverNewsExtractor,
  general: GeneralNewsExtractor,
  googleNews: GoogleNewsRedirectExtractor,
} as const;

// Exporting individual classes directly as well
export {
  UnifiedNewsExtractor,
  NaverNewsExtractor,
  GeneralNewsExtractor,
  GoogleNewsRedirectExtractor,
}; 