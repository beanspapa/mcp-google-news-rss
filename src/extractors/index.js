import { UnifiedNewsExtractor } from "./unified-extractor.js";
import { NaverNewsExtractor } from "./naver-extractor.js";
import { GeneralNewsExtractor } from "./general-extractor.js";
import { GoogleNewsRedirectExtractor } from "./google-news-extractor.js";

// 메인 통합 추출기 (권장)
export const createExtractor = () => {
  return new UnifiedNewsExtractor();
};

// 간편한 추출 함수
export const extract = async (url, options = {}) => {
  const extractor = createExtractor();
  try {
    const result = await extractor.extract(url, options);
    await extractor.close();
    return result;
  } catch (error) {
    await extractor.close();
    throw error;
  }
};

// 배치 추출 함수
export const extractBatch = async (urls, options = {}) => {
  const extractor = createExtractor();
  try {
    const results = await extractor.extractBatch(urls, options);
    await extractor.close();
    return results;
  } catch (error) {
    await extractor.close();
    throw error;
  }
};

// 지원 사이트 목록 조회
export const getSupportedSites = () => {
  const extractor = createExtractor();
  if (typeof extractor.getSupportedSites === "function") {
    return extractor.getSupportedSites();
  } else {
    console.warn(
      "getSupportedSites method not found on UnifiedNewsExtractor. Returning empty array."
    );
    return [];
  }
};

// 개별 추출기들 (고급 사용자용)
export const extractors = {
  unified: UnifiedNewsExtractor,
  naver: NaverNewsExtractor,
  general: GeneralNewsExtractor,
  googleNews: GoogleNewsRedirectExtractor,
};

// Exporting individual classes directly as well
export {
  UnifiedNewsExtractor,
  NaverNewsExtractor,
  GeneralNewsExtractor,
  GoogleNewsRedirectExtractor,
};
