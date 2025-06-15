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
import { logInfo, logWarning } from "../logger.js";

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
    logInfo(`🚀 통합 추출기 시작: ${url}`);

    try {
      const { extractor, name } = this.getExtractorForUrl(url);
      logInfo(`📌 선택된 추출기: ${name}`);

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
        logWarning(
          `⚠️ ${name} 추출기 오류: ${err.message}. 범용 추출기로 대체합니다.`
        );
        fallbackReason = `${name} 추출 실패: ${err.message}`;
        if (extractor !== this.generalExtractor) {
          logInfo("🔄 범용 추출기로 재시도...");
          article = await this.generalExtractor.extract(url, options);
        }
      }

      if (!article || !article.content) {
        if (extractor !== this.generalExtractor && !fallbackReason) {
          logWarning(
            `⚠️ ${name} 추출기가 콘텐츠를 반환하지 못했습니다. 범용 추출기로 대체합니다.`
          );
          fallbackReason = `${name} 추출기 콘텐츠 없음`;
          article = await this.generalExtractor.extract(url, options);
        } else if (!article || !article.content) {
          logInfo(`🚫 모든 추출기가 콘텐츠를 추출하지 못했습니다: ${url}`);
          return null;
        }
      }

      const totalExtractionTime = Date.now() - startTime;
      logInfo(`⏱️ 총 추출 시간: ${totalExtractionTime}ms`);

      const unifiedArticle: UnifiedExtractedArticle = {
        ...(article as ExtractedArticleBase),
        sourceUrl: this.getActualSourceUrl(article, url),
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
      logInfo(`💥 통합 추출기 심각한 오류: ${err.message}`);
      return null;
    }
  }

  public async extractBatch(
    urls: string[],
    options?: any
  ): Promise<{ results: (UnifiedExtractedArticle | null)[]; errors: any[] }> {
    const BATCH_SIZE = 5; // 한 번에 처리할 동시 요청 수
    const allResults: (UnifiedExtractedArticle | null)[] = [];
    const allErrors: { url: string; error: string }[] = [];

    logInfo(
      `🚀 통합 추출기 배치 작업 시작: ${urls.length}개 URL, 동시성: ${BATCH_SIZE}`
    );

    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const chunk = urls.slice(i, i + BATCH_SIZE);
      logInfo(
        `- 처리 중인 배치: ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          urls.length / BATCH_SIZE
        )}, 크기: ${chunk.length}`
      );

      const promises = chunk.map((url) =>
        this.extract(url, options).catch((error) => ({
          error: error instanceof Error ? error : new Error(String(error)),
          url,
        }))
      );

      const settledResults = await Promise.allSettled(promises);

      settledResults.forEach((result, index) => {
        const originalUrl = chunk[index];
        if (result.status === "fulfilled") {
          const value = result.value;
          // `sourceUrl` 속성이 있으면 성공적인 추출로 간주
          if (value && "sourceUrl" in value) {
            allResults.push(value as UnifiedExtractedArticle);
          } else if (value && "error" in value) {
            const errPayload = value as { url: string; error: Error };
            allErrors.push({
              url: errPayload.url,
              error: errPayload.error.message,
            });
          } else {
            // null을 반환한 경우
            allErrors.push({
              url: originalUrl,
              error: "Extraction returned null",
            });
          }
        } else {
          // Promise 자체가 실패한 경우 (내부 catch에서 잡지 못한 오류)
          allErrors.push({
            url: originalUrl,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
        }
      });
    }

    logInfo(
      `🏁 통합 추출기 배치 작업 완료: 성공 ${allResults.length}, 실패 ${allErrors.length}`
    );
    return { results: allResults, errors: allErrors };
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

  private getActualSourceUrl(
    article:
      | ExtractedArticleBase
      | ExtractedGoogleArticle
      | ExtractedNaverArticle
      | ExtractedGeneralArticle
      | null,
    originalUrl: string
  ): string {
    if (!article) {
      return originalUrl;
    }
    // 구글 뉴스 추출기의 경우 실제 언론사 URL 반환
    if ("originalGoogleUrl" in article && article.sourceUrl) {
      return article.sourceUrl;
    }
    // 기본적으로 article의 sourceUrl 또는 원본 URL 반환
    return article.sourceUrl || originalUrl;
  }

  public async closeAll(): Promise<void> {
    logInfo("🚪 모든 추출기 리소스 정리 중...");
    const closePromises: Promise<void>[] = [];

    if (this.googleExtractor.close) {
      closePromises.push(this.googleExtractor.close());
    }
    if (this.generalExtractor.close) {
      closePromises.push(this.generalExtractor.close());
    }

    try {
      await Promise.all(closePromises);
      logInfo("✅ 모든 추출기 리소스 정리 완료");
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logInfo(`💥 추출기 리소스 정리 중 오류: ${err.message}`);
    }
  }
}
