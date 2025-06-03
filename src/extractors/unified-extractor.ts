import { NaverNewsExtractor } from "./naver-extractor.js";
import { GeneralNewsExtractor } from "./general-extractor.js";
import { GoogleNewsRedirectExtractor } from "./google-news-extractor.js";
import {
  UnifiedExtractedArticle,
  Extractor,
  ExtractorMapping,
  ExtractorMappingValue,
  UnifiedNewsExtractorOptions,
  ExtractedArticleBase,
  ExtractedGoogleArticle,
  ExtractedNaverArticle,
  ExtractedGeneralArticle,
} from "./types.js";

export class UnifiedNewsExtractor {
  private googleExtractor: GoogleNewsRedirectExtractor;
  private naverExtractor: NaverNewsExtractor;
  private generalExtractor: GeneralNewsExtractor;
  private extractorMapping: ExtractorMapping;
  private options: UnifiedNewsExtractorOptions;

  constructor(options: UnifiedNewsExtractorOptions = {}) {
    this.options = options;
    this.googleExtractor = new GoogleNewsRedirectExtractor(this.options as any);
    this.naverExtractor = new NaverNewsExtractor();
    this.generalExtractor = new GeneralNewsExtractor();

    this.extractorMapping = {
      "naver.com": { extractor: this.naverExtractor, name: "Naver" },
      "google.com": { extractor: this.googleExtractor, name: "GoogleNews" },
      default: { extractor: this.generalExtractor, name: "General" },
    };
  }

  public async extract(
    url: string,
    options?: any
  ): Promise<UnifiedExtractedArticle | null> {
    const startTime = Date.now();
    console.log(`🚀 통합 추출기 시작: ${url}`);

    try {
      const { extractor, name } = this.getExtractorForUrl(url);
      console.log(`📌 선택된 추출기: ${name}`);

      let article:
        | ExtractedArticleBase
        | ExtractedGoogleArticle
        | ExtractedNaverArticle
        | ExtractedGeneralArticle
        | null = null;
      let fallbackReason: string | undefined = undefined;

      try {
        article = await extractor.extract(url, options);
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `⚠️ ${name} 추출기 오류: ${err.message}. 범용 추출기로 대체합니다.`
        );
        fallbackReason = `${name} 추출 실패: ${err.message}`;
        if (extractor !== this.generalExtractor) {
          console.log("🔄 범용 추출기로 재시도...");
          article = await this.generalExtractor.extract(url, options);
        }
      }

      if (!article || !article.content) {
        if (extractor !== this.generalExtractor && !fallbackReason) {
          console.warn(
            `⚠️ ${name} 추출기가 콘텐츠를 반환하지 못했습니다. 범용 추출기로 대체합니다.`
          );
          fallbackReason = `${name} 추출기 콘텐츠 없음`;
          article = await this.generalExtractor.extract(url, options);
        } else if (!article || !article.content) {
          console.error(
            `🚫 모든 추출기가 콘텐츠를 추출하지 못했습니다: ${url}`
          );
          return null;
        }
      }

      const totalExtractionTime = Date.now() - startTime;
      console.log(`⏱️ 총 추출 시간: ${totalExtractionTime}ms`);

      const unifiedArticle: UnifiedExtractedArticle = {
        ...(article as ExtractedArticleBase),
        unified: {
          detectedSite: this.detectSite(url),
          extractorUsed:
            fallbackReason && extractor !== this.generalExtractor
              ? this.generalExtractor.constructor.name
              : extractor.constructor.name,
          totalExtractionTime,
          url,
          timestamp: new Date().toISOString(),
          metadata: article?.metadata,
          fallbackReason,
        },
      };
      return unifiedArticle;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`💥 통합 추출기 심각한 오류: ${err.message}`);
      return null;
    }
  }

  public async extractBatch(
    urls: string[],
    options?: any
  ): Promise<{ results: (UnifiedExtractedArticle | null)[]; errors: any[] }> {
    console.log(`🚀 통합 추출기 배치 작업 시작: ${urls.length}개 URL`);
    const results: (UnifiedExtractedArticle | null)[] = [];
    const errors: { url: string; error: string }[] = [];

    for (const url of urls) {
      try {
        const result = await this.extract(url, options);
        if (result) {
          results.push(result);
        } else {
          errors.push({
            url,
            error: "Extraction returned null or empty content",
          });
        }
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`💥 배치 작업 중 오류 (${url}): ${err.message}`);
        errors.push({ url, error: err.message });
      }
    }

    console.log(
      `🏁 통합 추출기 배치 작업 완료: 성공 ${results.length}, 실패 ${errors.length}`
    );
    return { results, errors };
  }

  private getExtractorForUrl(url: string): ExtractorMappingValue {
    const domain = this.extractDomain(url);
    if (domain && this.extractorMapping[domain]) {
      return this.extractorMapping[domain];
    }
    if (url.includes("news.naver.com"))
      return this.extractorMapping["naver.com"];
    if (url.includes("news.google.com"))
      return this.extractorMapping["google.com"];
    return this.extractorMapping["default"];
  }

  private extractDomain(url: string): string | null {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch (e) {
      return null;
    }
  }

  private detectSite(url: string): string {
    const domain = this.extractDomain(url);
    if (domain) {
      if (domain.includes("naver.com")) return "Naver";
      if (domain.includes("google.com")) return "GoogleNews";
      return domain;
    }
    return "Unknown";
  }

  public async closeAll(): Promise<void> {
    console.log("🚪 모든 추출기 리소스 정리 중...");
    const closePromises: Promise<void>[] = [];

    if (this.googleExtractor.close) {
      closePromises.push(this.googleExtractor.close());
    }
    if (this.generalExtractor.close) {
      closePromises.push(this.generalExtractor.close());
    }

    try {
      await Promise.all(closePromises);
      console.log("✅ 모든 추출기 리소스 정리 완료");
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`💥 추출기 리소스 정리 중 오류: ${err.message}`);
    }
  }
}

module.exports = { UnifiedNewsExtractor };
