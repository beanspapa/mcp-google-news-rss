import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import {
  ExtractedNaverArticle,
  NaverArticleStats,
  NaverArticleMetadata,
  NaverNewsExtractorOptions,
} from "./types.js";
import { logInfo, logWarning } from "../logger.js";

export class NaverNewsExtractor {
  private userAgents: string[];

  constructor() {
    this.userAgents = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];
  }

  async extract(
    url: string,
    options: NaverNewsExtractorOptions = {}
  ): Promise<ExtractedNaverArticle> {
    const startTime = Date.now();

    try {
      logInfo("🔵 네이버 뉴스 전용 추출기 시작");

      if (!this.isNaverNewsUrl(url)) {
        throw new Error("네이버 뉴스 URL이 아닙니다.");
      }

      const html: string = await this.fetchHTML(url);
      const result: Omit<ExtractedNaverArticle, "performance"> =
        await this.parseNaverNews(html, url);

      return {
        ...result,
        performance: {
          extractionTime: Date.now() - startTime,
          method: "Naver News Specialized Extractor",
        },
      } as ExtractedNaverArticle;
    } catch (error: any) {
      throw new Error(`네이버 뉴스 추출 실패: ${error.message}`);
    }
  }

  private isNaverNewsUrl(url: string): boolean {
    const naverNewsPatterns: RegExp[] = [
      /^https?:\/\/news\.naver\.com/,
      /^https?:\/\/n\.news\.naver\.com/,
      /^https?:\/\/.*\.naver\.com.*\/news/,
    ];
    return naverNewsPatterns.some((pattern) => pattern.test(url));
  }

  private async fetchHTML(url: string): Promise<string> {
    logInfo("🔍 네이버 뉴스 HTML 가져오기 시작...");

    for (const userAgent of this.userAgents) {
      try {
        logInfo(
          `  시도: ${
            userAgent.includes("Googlebot")
              ? "Googlebot"
              : userAgent.includes("bingbot")
              ? "Bingbot"
              : "Chrome"
          }`
        );

        const response: AxiosResponse<string> = await axios.get(url, {
          timeout: 10000,
          headers: {
            "User-Agent": userAgent,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate",
            "Cache-Control": "no-cache",
          },
        });

        if (this.isValidNaverNewsHTML(response.data)) {
          logInfo(`  ✅ 성공: 유효한 네이버 뉴스 페이지`);
          return response.data;
        }
      } catch (error: any) {
        logWarning(`  ❌ 실패: ${error.message}`);
      }
    }
    throw new Error(
      "모든 User-Agent로 시도했지만 네이버 뉴스를 가져올 수 없습니다."
    );
  }

  private isValidNaverNewsHTML(html: string): boolean {
    const $ = cheerio.load(html);
    const indicators = [
      $("#dic_area").length > 0,
      ($('meta[property="og:url"]').attr("content") || "").includes(
        "naver.com"
      ),
      ($("title").text() || "").length > 5,
      html.includes("뉴스") || html.includes("news"),
      html.length > 5000,
    ];
    const validScore = indicators.filter(Boolean).length;
    logInfo(`    네이버 뉴스 검증 점수: ${validScore}/5`);
    return validScore >= 3;
  }

  private async parseNaverNews(
    html: string,
    sourceUrl: string
  ): Promise<Omit<ExtractedNaverArticle, "performance">> {
    const $ = cheerio.load(html);
    logInfo(`🔵 네이버 뉴스 DOM 분석: 총 ${$("*").length}개 요소`);

    const metadata: Partial<NaverArticleMetadata> =
      this.extractNaverMetadata($);
    const title = this.extractNaverTitle($);
    const author = this.extractNaverAuthor($);
    const publishDate = this.extractNaverPublishDate($);
    const description = this.extractNaverDescription($);
    const content = this.extractNaverContent($);

    logInfo(`📄 네이버 뉴스 추출 완료: ${content.length}자`);
    const stats = this.calculateStats(content);

    return {
      title,
      content,
      author,
      publishDate,
      description,
      sourceUrl,
      metadata: {
        ...metadata,
        sourceUrl,
        extractionMethod: "Naver News Specialized",
        timestamp: new Date().toISOString(),
      },
      stats,
    } as Omit<ExtractedNaverArticle, "performance">;
  }

  private extractNaverContent($: cheerio.CheerioAPI): string {
    logInfo("🔵 네이버 뉴스 본문 추출 시작...");
    const naverSelectors: string[] = [
      "#dic_area",
      "#newsct_article",
      ".go_trans_hide",
      "#content",
    ];
    let bestContent = "";
    let bestSelector = "";

    for (const selector of naverSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const textLength = (element.text() || "").trim().length;
        logInfo(`  확인: ${selector} - ${textLength}자`);
        if (textLength > bestContent.length) {
          bestContent = (element.text() || "").trim();
          bestSelector = selector;
        }
      }
    }

    if (!bestContent) {
      logWarning("⚠️ 네이버 전용 선택자로 콘텐츠를 찾을 수 없음, 전체 탐색");
      bestContent = ($("body").text() || "").trim();
      bestSelector = "body (fallback)";
    }
    logInfo(`✅ 최적 선택자: ${bestSelector} (${bestContent.length}자)`);
    const cleanedContent = this.cleanNaverContent(bestContent);
    return cleanedContent;
  }

  private cleanNaverContent(content: string): string {
    logInfo("🧹 네이버 콘텐츠 정제 시작...");
    const naverNoisePatterns: RegExp[] = [
      /언론사 구독, 기자 구독.*?더 보기/g,
      /네이버에서 제공하는.*?보기/g,
      /본 콘텐츠는.*?제공됩니다\./g,
      /번역하기|원문|펼치기|접기|더보기|닫기/g,
      /\[앵커\]|\[기자\]|\[리포트\]|\[해설\]/g,
      /뉴스홈|스포츠|연예|경제/g,
      /이전기사|다음기사|기사목록/g,
      /\[광고\]|\[협찬\]|\[PR\]/g,
      /공유하기|스크랩|댓글|추천/g,
      /\s{3,}/g,
      /\n{3,}/g,
      /[^\w\s가-힣.,!?'"()\-:;]/g,
    ];
    let cleaned = content;
    naverNoisePatterns.forEach((pattern, index) => {
      const before = cleaned.length;
      if (index < naverNoisePatterns.length - 3) {
        // Adjusted index for last 3 patterns
        cleaned = cleaned.replace(pattern, " ");
      } else if (index === naverNoisePatterns.length - 3) {
        // Excessive spaces
        cleaned = cleaned.replace(pattern, " ");
      } else if (index === naverNoisePatterns.length - 2) {
        // Excessive newlines
        cleaned = cleaned.replace(pattern, "\n"); // Keep one newline
      } else {
        // Unnecessary special characters - replace with space
        cleaned = cleaned.replace(pattern, " ");
      }
      const after = cleaned.length;
      if (before !== after) {
        logInfo(`  패턴 ${index + 1} 제거: ${before - after}자 감소`);
      }
    });

    const sentences = cleaned.split(/[.!?]+/).filter((sentence) => {
      const trimmed = sentence.trim();
      return trimmed.length > 10 && !trimmed.match(/^[0-9\s\-:]+$/);
    });
    const result = sentences.join(". ").trim();
    logInfo(`🧹 네이버 콘텐츠 정제 완료: ${result.length}자`);
    return result;
  }

  private extractNaverTitle($: cheerio.CheerioAPI): string {
    logInfo("🔵 네이버 뉴스 제목 추출 시작...");
    const selectors = [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      ".media_end_head_headline", // 네이버뉴스 최신 포맷
      "#title_area span",
      ".title",
      "h1",
      "h2",
      "title", // 최후의 수단
    ];
    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        let title = selector.startsWith("meta")
          ? element.attr("content")
          : element.text();
        if (title) {
          title = title.trim();
          if (title.length > 5) {
            logInfo(`  ✅ 제목 발견 (${selector}): ${title}`);
            return title
              .replace(/\n/g, " ")
              .replace(/\s{2,}/g, " ")
              .trim();
          }
        }
      }
    }
    logWarning("⚠️ 제목을 찾을 수 없음");
    return "제목을 찾을 수 없습니다";
  }

  private extractNaverAuthor($: cheerio.CheerioAPI): string {
    logInfo("🔵 네이버 뉴스 작성자 추출 시작...");
    // 1. JSON-LD (application/ld+json) 스크립트에서 작성자 정보 추출 (가장 정확)
    try {
      const ldJsonScript = $('script[type="application/ld+json"]');
      if (ldJsonScript.length > 0) {
        for (let i = 0; i < ldJsonScript.length; i++) {
          const scriptContent = $(ldJsonScript[i]).html();
          if (scriptContent) {
            const jsonData = JSON.parse(scriptContent);
            if (jsonData && jsonData.author && jsonData.author.name) {
              const authorName = jsonData.author.name.trim();
              if (
                authorName &&
                authorName.length > 1 &&
                authorName.length < 50 &&
                !authorName.includes("네이버") &&
                !authorName.includes("naver")
              ) {
                logInfo(`  ✅ 작성자 발견 (JSON-LD): ${authorName}`);
                return authorName;
              }
            }
            // Sometimes author is an array
            if (jsonData && Array.isArray(jsonData.author)) {
              for (const auth of jsonData.author) {
                if (auth.name) {
                  const authorName = auth.name.trim();
                  if (
                    authorName &&
                    authorName.length > 1 &&
                    authorName.length < 50 &&
                    !authorName.includes("네이버") &&
                    !authorName.includes("naver")
                  ) {
                    logInfo(`  ✅ 작성자 발견 (JSON-LD Array): ${authorName}`);
                    return authorName;
                  }
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
      logWarning(`  ⚠️ JSON-LD 파싱 중 오류: ${e.message}`);
    }

    // 2. 메타 태그에서 작성자 정보 추출
    const metaSelectors = [
      'meta[property="article:author"]',
      'meta[name="author"]',
      'meta[name="twitter:creator"]',
      'meta[property="og:article:author"]',
    ];
    for (const selector of metaSelectors) {
      const author = $(selector).attr("content")?.trim();
      if (
        author &&
        author.length > 1 &&
        author.length < 50 &&
        !author.includes("네이버") &&
        !author.includes("naver")
      ) {
        logInfo(`  ✅ 작성자 발견 (메타태그 ${selector}): ${author}`);
        return author;
      }
    }

    // 3. 텍스트 기반 선택자 (네이버 뉴스 페이지 구조에 특화)
    const textSelectors = [
      ".media_end_head_journalist_name", // 최신 네이버 뉴스 기자 이름
      ".journalist_name", // 이전 포맷 기자 이름
      ".byline_p span:first-child", // 작성자 영역 (일반적)
      ".author", // 일반적인 author 클래스
      ".writer", // writer 클래스
      ".reporter", // reporter 클래스
      ".profile_info .name", // 프로필 영역 이름
      ".byline", // byline 클래스
      ".journalist_info .name", // 연합뉴스TV 같은 곳
    ];
    for (const selector of textSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        let authorText = element.text()?.trim();
        if (authorText) {
          // "홍길동 기자", "(서울=연합뉴스) 홍길동 기자" 같은 패턴에서 이름만 추출
          const match = authorText.match(
            /(?:\(|^)([^()\s]+)\s*기자|(?:^|\s)([가-힣]{2,5})\s*기자(?:\s|$)|(?:^|\s)([가-힣]{2,5})(?:\s*특파원|\s* кореспондент|\s* مراسل)/
          );
          if (match) {
            authorText = match[1] || match[2] || match[3] || authorText;
          }
          authorText = authorText
            .replace(
              /기자|특파원|입력|수정|사진|영상|PD|앵커|교수|연구원|변호사|위원|대표|원장|사장|작가|\(.*?\)|ⓒ.*/g,
              ""
            )
            .trim();
          if (
            authorText &&
            authorText.length > 1 &&
            authorText.length < 20 &&
            !authorText.includes("네이버")
          ) {
            logInfo(`  ✅ 작성자 발견 (${selector}): ${authorText}`);
            return authorText;
          }
        }
      }
    }
    logWarning("⚠️ 작성자를 찾을 수 없음");
    return "";
  }

  private extractNaverPublishDate($: cheerio.CheerioAPI): string | null {
    logInfo("🔵 네이버 뉴스 발행일 추출 시작...");
    // 1. JSON-LD (가장 정확)
    try {
      const ldJsonScript = $('script[type="application/ld+json"]');
      if (ldJsonScript.length > 0) {
        for (let i = 0; i < ldJsonScript.length; i++) {
          const scriptContent = $(ldJsonScript[i]).html();
          if (scriptContent) {
            const jsonData = JSON.parse(scriptContent);
            const datePublished = jsonData.datePublished || jsonData.uploadDate;
            if (datePublished) {
              const parsedDate = this.parseNaverDate(datePublished);
              if (parsedDate) {
                logInfo(`  ✅ 발행일 발견 (JSON-LD): ${parsedDate}`);
                return parsedDate;
              }
            }
          }
        }
      }
    } catch (e: any) {
      logWarning(`  ⚠️ JSON-LD 날짜 파싱 중 오류: ${e.message}`);
    }

    // 2. 메타 태그
    const metaSelectors = [
      'meta[property="article:published_time"]',
      'meta[property="og:regDate"]',
      'meta[name="publishdate"]',
      'meta[name="DCSext.articlefirstpublished"]',
    ];
    for (const selector of metaSelectors) {
      const dateStr = $(selector).attr("content");
      if (dateStr) {
        const parsedDate = this.parseNaverDate(dateStr);
        if (parsedDate) {
          logInfo(`  ✅ 발행일 발견 (메타태그 ${selector}): ${parsedDate}`);
          return parsedDate;
        }
      }
    }

    // 3. 텍스트 기반 선택자 (네이버 뉴스 페이지 구조에 특화)
    const textSelectors = [
      ".media_end_head_info_datestamp_time._ARTICLE_DATE_TIME", // 최신 포맷 (날짜와 시간 모두 포함)
      ".media_end_head_info_datestamp_time[data-date-time]", // 위와 동일, data 속성 활용
      ".article_info .date", // 이전 포맷
      ".info_group .date", // 다른 포맷
      ".byline_p .date", // 또 다른 포맷
      ".sponsor_date", // 스포츠 뉴스 등
      ".date", // 일반적인 date 클래스
      ".time", // 일반적인 time 클래스 (날짜 포함 경우)
      ".article_header .date_commit_area .date_area .date_info span", // 복잡한 구조
    ];

    for (const selector of textSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        let dateStr =
          element.attr("data-date-time") ||
          element.attr("data-modify-date-time") ||
          element.text();
        if (dateStr) {
          const parsedDate = this.parseNaverDate(dateStr.trim());
          if (parsedDate) {
            logInfo(`  ✅ 발행일 발견 (${selector}): ${parsedDate}`);
            return parsedDate;
          }
        }
      }
    }
    logWarning("⚠️ 발행일을 찾을 수 없음");
    return null;
  }

  // 네이버 날짜 문자열 파싱 (다양한 포맷 처리)
  private parseNaverDate(dateStr: string): string | null {
    if (!dateStr || typeof dateStr !== "string") return null;
    logInfo(`  파싱 시도: "${dateStr}"`);
    let cleanedDateStr = dateStr.trim();

    // "YYYY.MM.DD. 오전/오후 H:mm" 또는 "YYYY.MM.DD HH:mm"
    let match = cleanedDateStr.match(
      /(\d{4})\.(\d{1,2})\.(\d{1,2})\.?\s*(?:(오전|오후)\s*)?(\d{1,2}):(\d{1,2})/
    );
    if (match) {
      let year = parseInt(match[1]);
      let month = parseInt(match[2]) - 1; // JS month is 0-indexed
      let day = parseInt(match[3]);
      let hour = parseInt(match[5]);
      const minute = parseInt(match[6]);
      const ampm = match[4]; // 오전/오후

      if (ampm === "오후" && hour < 12) hour += 12;
      if (ampm === "오전" && hour === 12) hour = 0; // 12 AM is 00 hours

      try {
        return new Date(year, month, day, hour, minute).toISOString();
      } catch (e) {
        /* ignore parsing error for this format */
      }
    }

    // ISO 8601 Format (e.g., 2023-10-27T10:30:00+09:00)
    if (
      cleanedDateStr.includes("T") &&
      (cleanedDateStr.includes("+") || cleanedDateStr.includes("Z"))
    ) {
      try {
        return new Date(cleanedDateStr).toISOString();
      } catch (e) {
        /* ignore */
      }
    }

    // "YYYY-MM-DD HH:mm:ss"
    match = cleanedDateStr.match(
      /(\d{4})-(\d{1,2})-(\d{1,2})\s*(\d{1,2}):(\d{1,2}):?(\d{1,2})?/
    );
    if (match) {
      try {
        return new Date(
          parseInt(match[1]),
          parseInt(match[2]) - 1,
          parseInt(match[3]),
          parseInt(match[4]),
          parseInt(match[5]),
          match[6] ? parseInt(match[6]) : 0
        ).toISOString();
      } catch (e) {
        /* ignore */
      }
    }

    // "YYYY.MM.DD" (시간 정보 없을 때)
    match = cleanedDateStr.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    if (match) {
      try {
        return (
          new Date(
            parseInt(match[1]),
            parseInt(match[2]) - 1,
            parseInt(match[3])
          )
            .toISOString()
            .split("T")[0] + "T00:00:00.000Z"
        ); // 자정으로 설정
      } catch (e) {
        /* ignore */
      }
    }

    logWarning(`  ⚠️ 지원하지 않는 날짜 포맷: "${dateStr}"`);
    return null;
  }

  private extractNaverDescription($: cheerio.CheerioAPI): string {
    const selectors = [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]',
    ];
    for (const selector of selectors) {
      const description = $(selector).attr("content")?.trim();
      if (description && description.length > 10) {
        logInfo(
          `  ✅ 설명 발견 (${selector}): ${description.substring(0, 50)}...`
        );
        return description;
      }
    }
    return "";
  }

  private extractNaverMetadata(
    $: cheerio.CheerioAPI
  ): Partial<NaverArticleMetadata> {
    const metadata: Partial<NaverArticleMetadata> = {};
    const ogUrl = $('meta[property="og:url"]').attr("content");
    if (ogUrl) {
      const urlParams = new URLSearchParams(ogUrl.split("?")[1]);
      metadata.oid = urlParams.get("oid") || undefined;
      metadata.aid = urlParams.get("aid") || undefined;
    }
    metadata.domain = "news.naver.com";
    metadata.language = $("html").attr("lang") || "ko";
    metadata.keywords = $('meta[name="keywords"]').attr("content") || undefined;
    metadata.totalElements = $("*").length;
    // 네이버는 보통 UTF-8이지만, 명시적 charset 감지 시도
    const charset =
      $("meta[charset]").attr("charset") ||
      $('meta[http-equiv="Content-Type"]')
        .attr("content")
        ?.match(/charset=([^;]+)/i)?.[1];
    metadata.detectedCharset = charset?.trim() || undefined;

    // 추가적인 네이버 관련 정보 (예: 카테고리)
    metadata.naverSpecific = {
      category:
        $(".media_end_categorize_item").first().text()?.trim() ||
        $(".Nlist_item._LNB_ITEM.is_active").text()?.trim() ||
        undefined,
    };
    return metadata;
  }

  private calculateStats(text: string): NaverArticleStats {
    const words = text.split(/\s+/).filter(Boolean).length;
    const sentences = text.split(/[.!?]+/).filter(Boolean).length;
    const paragraphs = text.split(/\n\s*\n/).filter(Boolean).length;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, "").length;
    const readingTime = Math.ceil(words / 200);
    return {
      words,
      sentences,
      paragraphs,
      characters,
      charactersNoSpaces,
      readingTimeMinutes: readingTime,
    };
  }
}
