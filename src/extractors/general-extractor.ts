import type { HtmlToTextOptions } from "html-to-text";
import * as cheerio from "cheerio";
import axios, { AxiosResponse } from "axios";
import {
  ExtractedGeneralArticle as ExtractedArticle,
  GeneralArticleStats,
  GeneralArticleMetadata,
  FetchOptions,
  SSRResult,
} from "./types.js";
import { logInfo, logWarning, logError } from "../logger.js";
import { chromium, Browser, Page, Route } from "playwright-ghost";

export class GeneralNewsExtractor {
  private browser: Browser | null;
  private htmlToTextOptions: HtmlToTextOptions;

  constructor() {
    this.browser = null;
    this.htmlToTextOptions = {
      wordwrap: false,
      preserveNewlines: true,
      baseElements: {
        selectors: [
          "article",
          ".article-content",
          ".post-content",
          ".content",
          "main",
        ],
        returnDomByDefault: true,
      },
      selectors: [
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" },
      ],
    };
  }

  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      logInfo("🚀 Playwright 브라우저 초기화 중...");
      this.browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-features=VizDisplayCompositor",
        ],
      });
    }
    return this.browser;
  }

  async extract(
    url: string,
    options: FetchOptions = {}
  ): Promise<ExtractedArticle> {
    const startTime = Date.now();
    let html: string = "";
    let extractionMethod: string = "Unknown";

    try {
      logInfo("🌐 범용 뉴스 추출기 시작");

      if (options.forcePlaywright) {
        logInfo("🚀 Playwright 강제 사용 모드");
        html = await this.fetchWithPlaywright(url);
        extractionMethod = "Playwright (Forced)";
      } else {
        const fetchResult: string = await this.fetchWithAxios(url);
        html = fetchResult;
        extractionMethod = "Simple Fetch";

        if (this.isSSRContent(html)) {
          extractionMethod = "SSR/SEO Optimized Fetch";
        }

        if (this.isSPA(html)) {
          logInfo("🔍 SPA 감지됨, Playwright로 전환...");
          html = await this.fetchWithPlaywright(url);
          extractionMethod = "Playwright (SPA Support)";
        }
      }

      const result: Omit<ExtractedArticle, "performance"> =
        await this.parseGeneralNews(html, url, extractionMethod);

      return {
        ...result,
        performance: {
          extractionTime: Date.now() - startTime,
          method: extractionMethod,
        },
      };
    } catch (error: any) {
      if (extractionMethod.includes("Playwright") && this.browser) {
        await this.close();
      }
      throw new Error(`범용 추출 실패 (${extractionMethod}): ${error.message}`);
    }
  }

  private async fetchWithAxios(url: string): Promise<string> {
    try {
      logInfo("🔍 1차 전략: SSR/SEO 버전 시도 중...");
      const ssrResult: SSRResult = await this.trySSRVersions(url);
      if (ssrResult.success && ssrResult.data) {
        logInfo(`✅ SSR 성공: ${ssrResult.method}`);
        return ssrResult.data;
      }

      logInfo("⚠️ SSR 실패, 일반 요청으로 대체");
      const response: AxiosResponse<string> = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Axios 페이지 가져오기 실패: ${error.message}`);
    }
  }

  private async trySSRVersions(url: string): Promise<SSRResult> {
    const strategies = [
      {
        name: "Googlebot User-Agent",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      },
      {
        name: "Bingbot User-Agent",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
          Accept: "text/html,application/xhtml+xml",
        },
      },
      {
        name: "Mobile User-Agent (경량 버전)",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1",
          Accept: "text/html",
        },
      },
    ];

    for (const strategy of strategies) {
      try {
        logInfo(`  시도: ${strategy.name}`);
        const response: AxiosResponse<string> = await axios.get(url, {
          timeout: 8000,
          headers: strategy.headers,
        });
        if (this.isSSRContent(response.data)) {
          return {
            success: true,
            method: strategy.name,
            data: response.data,
          };
        }
        logInfo(`  ❌ ${strategy.name}: SSR 콘텐츠 감지 실패`);
      } catch (error: any) {
        logInfo(`  ❌ ${strategy.name} 요청 실패: ${error.message}`);
      }
    }
    return { success: false };
  }

  private isSSRContent(html: string): boolean {
    if (!html || typeof html !== "string" || html.length < 100) return false;
    const $ = cheerio.load(html);

    const hasContent =
      $("p").length > 2 ||
      $("article").length > 0 ||
      $(
        '.content, .article-content, #content, [role="main"], [itemprop="articleBody"]'
      ).length > 0;

    const notLoadingState =
      !html.includes("Loading...") &&
      !html.includes("loading...") &&
      !html.includes("Please wait") &&
      !($('body[class*="loading"]').length > 0) &&
      !($('div[id*="spinner"]').length > 0) &&
      !($('div[class*="spinner"]').length > 0) &&
      !($('body[data-loading="true"]').length > 0) &&
      !($('div[aria-busy="true"]').length > 0) &&
      !(
        $("#root").length > 0 && ($("#root").text() || "").trim().length < 100
      ) &&
      !($("#app").length > 0 && ($("#app").text() || "").trim().length < 100);

    const textLength = $("body").text().trim().length;
    const hasEnoughText = textLength > 500;

    const notSecurityPage =
      !html.includes("Cloudflare") &&
      !html.includes("Just a moment") &&
      !html.includes("Enable JavaScript and cookies") &&
      !html.includes("Attention Required!") &&
      !html.includes("Verifying you are human");

    logInfo(
      `    콘텐츠 확인: content=${hasContent}, notLoading=${notLoadingState}, textLength=${textLength}, notSecurity=${notSecurityPage}`
    );
    return hasContent && notLoadingState && hasEnoughText && notSecurityPage;
  }

  private async fetchWithPlaywright(url: string): Promise<string> {
    const browser = await this.initBrowser();
    let page: Page | null = null;

    try {
      page = await browser.newPage();
      await page.route("**/*", (route: Route) => {
        const resourceType = route.request().resourceType();
        if (
          ["image", "stylesheet", "font", "media", "other"].includes(
            resourceType
          )
        ) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 45000,
      });

      await this.waitForContent(page);
      const html = await page.content();
      return html;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async waitForContent(page: Page): Promise<void> {
    const selectors = [
      "article",
      ".article-content",
      ".post-content",
      ".content",
      "main p",
      "h1",
      '[role="main"]',
      '[itemprop="articleBody"]',
    ];

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        logInfo(`✅ 콘텐츠 감지됨: ${selector}`);
        return;
      } catch (e) {
        // 다음 선택자 시도
      }
    }
    logInfo("⏳ 모든 선택자 감지 실패, 기본 대기 시간 적용 (3초)");
    await page.waitForTimeout(3000);
  }

  private isSPA(html: string): boolean {
    if (!html || typeof html !== "string" || html.length < 100) {
      return false;
    }
    const $ = cheerio.load(html);

    const scriptKeywords = [
      "react",
      "vue",
      "angular",
      "app-root",
      "main.js",
      "bundle.js",
    ];
    let foundScriptKeyword = false;
    $("script").each((index: number, element: any) => {
      const scriptContent = $(element).html();
      if (scriptContent) {
        for (const keyword of scriptKeywords) {
          if (scriptContent.toLowerCase().includes(keyword)) {
            foundScriptKeyword = true;
            return false;
          }
        }
      }
    });
    if (foundScriptKeyword) {
      logInfo("    SPA 단서: 스크립트 키워드 발견");
      return true;
    }

    const commonMountPoints = ["#root", "#app", "div[data-reactroot]"];
    for (const mountPoint of commonMountPoints) {
      const element = $(mountPoint);
      if (
        element.length > 0 &&
        (element.html()?.trim().length || 0) < 200 &&
        $("body").text().trim().length < 500
      ) {
        logInfo(`    SPA 단서: 마운트 포인트(${mountPoint}) 내용 부족`);
        return true;
      }
    }

    if (!this.isSSRContent(html) && $("body").text().trim().length < 300) {
      logInfo("    SPA 단서: SSR 실패 및 텍스트 부족");
      return true;
    }

    logInfo("    SPA 아님 또는 판단 불가");
    return false;
  }

  async parseGeneralNews(
    html: string,
    sourceUrl: string,
    extractionMethod: string
  ): Promise<Omit<ExtractedArticle, "performance">> {
    const $ = cheerio.load(html);
    logInfo(
      `🔵 범용 DOM 분석: 총 ${$("*").length}개 요소, 방식: ${extractionMethod}`
    );

    if (this.isCloudflareChallenge($, html)) {
      logWarning("☁️ Cloudflare 감지됨, 콘텐츠 추출이 제한될 수 있음");
      // Fallback or error handling for Cloudflare
    }

    const title = this.extractTitle($);
    let content = this.extractGeneralContent($);
    const author = this.extractAuthor($);
    const publishDate = this.extractPublishDate($);
    const description = this.extractDescription($);
    const metadata = this.extractMetadata($);

    metadata.sourceUrl = sourceUrl;
    metadata.extractionMethod = extractionMethod;
    metadata.domain = sourceUrl
      ? new URL(sourceUrl).hostname.replace("www.", "")
      : "";

    logInfo(`📄 범용 추출 완료: ${content.length}자`);

    const stats = this.calculateStats(content);

    return {
      title,
      content,
      author,
      publishDate,
      description,
      stats: stats as GeneralArticleStats,
      metadata: {
        ...(metadata as GeneralArticleMetadata),
        timestamp: new Date().toISOString(),
      },
    } as Omit<ExtractedArticle, "performance">;
  }

  isCloudflareChallenge($: cheerio.CheerioAPI, html: string): boolean {
    if (!html) return false;
    const titleText = $("title").text().toLowerCase();
    const indicators = [
      html.includes("Enable JavaScript and cookies to continue"),
      html.includes("Cloudflare"),
      html.includes("Ray ID:"),
      html.includes("challenge-error-text"),
      $("#challenge-error-text").length > 0,
      $(".cf-error-details").length > 0,
      $("title").text().includes("Just a moment"),
      $("*").length < 100 && html.includes("medium.com"),
    ];

    const cloudflareScore = indicators.filter(Boolean).length;
    return cloudflareScore >= 2;
  }

  extractGeneralContent($: cheerio.CheerioAPI): string {
    logInfo("🌐 범용 본문 추출 시작...");

    const generalSelectors = [
      { selector: "#harmonyContainer", priority: 9, site: "daum" },
      { selector: ".article_view", priority: 9, site: "daum" },

      { selector: "article", priority: 8, site: "general" },
      { selector: ".article-content", priority: 8, site: "general" },
      { selector: ".article_content", priority: 8, site: "general" },
      { selector: ".post-content", priority: 7, site: "general" },
      { selector: ".news-body", priority: 7, site: "general" },
      { selector: ".article-body", priority: 7, site: "general" },

      { selector: ".content", priority: 6, site: "general" },
      { selector: "#content", priority: 6, site: "general" },
      { selector: "main", priority: 5, site: "general" },

      { selector: ".entry-content", priority: 3, site: "general" },
    ];

    let bestMatch: {
      element: any;
      selector: string;
      priority: number;
      textLength: number;
      site: string;
    } | null = null;
    let bestPriority = -1;
    let bestTextLength = 0;

    for (const config of generalSelectors) {
      const element = $(config.selector).first();
      if (element.length && config.priority > 0) {
        const textLength = element.text().trim().length;
        logInfo(
          `   ${config.selector}: ${textLength}자 (우선순위: ${config.priority})`
        );

        if (
          config.priority > bestPriority ||
          (config.priority === bestPriority && textLength > bestTextLength)
        ) {
          if (textLength > 100) {
            bestMatch = {
              element: element,
              selector: config.selector,
              priority: config.priority,
              textLength: textLength,
              site: config.site,
            };
            bestPriority = config.priority;
            bestTextLength = textLength;
          }
        }
      }
    }

    let contentArea: any;
    if (bestMatch) {
      logInfo(
        `✅ 선택된 영역: ${bestMatch.selector} (우선순위: ${bestMatch.priority}, ${bestMatch.textLength}자, ${bestMatch.site})`
      );
      contentArea = bestMatch.element;
    } else {
      logInfo("⚠️ 우선순위 매칭 실패, 전체 페이지에서 추출");
      contentArea = $("body");
    }

    this.removeUnwantedElements(contentArea, bestMatch?.site || "general");

    const paragraphs: string[] = [];

    contentArea.find("p").each((i: number, element: any) => {
      const text = $(element).text().trim();
      if (text.length > 20) {
        paragraphs.push(text);
      }
    });

    contentArea
      .find("h1, h2, h3, h4, h5, h6")
      .each((i: number, element: any) => {
        const text = $(element).text().trim();
        if (text.length > 5 && text.length < 200) {
          paragraphs.push(`[제목] ${text}`);
        }
      });

    if (paragraphs.length < 3) {
      logInfo("📝 p 태그가 적음, div에서 추가 추출");
      contentArea.find("div").each((i: number, element: any) => {
        const text = $(element).text().trim();
        if (
          text.length > 30 &&
          text.length < 1000 &&
          $(element).children().length < 5
        ) {
          paragraphs.push(text);
        }
      });
    }

    const uniqueParagraphs: string[] = [];
    const seenTexts = new Set<string>();

    for (const para of paragraphs) {
      const normalizedText = para.replace(/\s+/g, " ").trim();
      if (normalizedText.length > 20 && !seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        uniqueParagraphs.push(normalizedText);
      }
    }

    const result = uniqueParagraphs.join("\n\n");
    logInfo(
      `📄 범용 추출 정리: ${result.length}자, ${uniqueParagraphs.length}문단`
    );

    return result;
  }

  removeUnwantedElements(contentArea: cheerio.CheerioAPI, site: string): void {
    const commonUnwanted = [
      "script",
      "style",
      "nav",
      "header",
      "footer",
      ".ad",
      ".advertisement",
      ".banner",
      ".social",
      ".share",
      ".comment",
      ".related",
      ".sidebar",
    ];

    const siteSpecificUnwanted: Record<string, string[]> = {
      daum: [".article_head", ".article_info"],
      general: [],
    };

    const unwantedSelectors = [
      ...commonUnwanted,
      ...(siteSpecificUnwanted[site] || []),
    ];

    unwantedSelectors.forEach((selector) => {
      try {
        const html = contentArea.html();
        if (html) {
          const $temp = cheerio.load(html);
          $temp(selector).remove();
          const cleanedHtml = $temp.html();
          if (cleanedHtml) {
            contentArea.html(cleanedHtml);
          }
        }
      } catch (error) {
        logWarning(`Failed to remove elements with selector: ${selector}`);
      }
    });
  }

  extractTitle($: cheerio.CheerioAPI): string {
    if (this.isGoogleNewsPage($)) {
      logInfo("🔍 구글 뉴스 페이지에서 제목 추출...");
      return this.extractGoogleNewsTitle($);
    }

    const selectors = [
      "h1",
      '[property="og:title"]',
      '[name="twitter:title"]',
      "title",
      ".article-title",
      ".news-title",
      "#title",
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const title = element.attr("content") || element.text();
        if (title && title.trim().length > 3) {
          return title.trim();
        }
      }
    }

    return "제목을 찾을 수 없습니다";
  }

  isGoogleNewsPage($: cheerio.CheerioAPI): boolean {
    const url = $('meta[property="og:url"]').attr("content") || "";
    const title = $("title").text() || "";

    return (
      url.includes("news.google.com") ||
      title.includes("Google 뉴스") ||
      title.includes("Google News")
    );
  }

  extractGoogleNewsTitle($: cheerio.CheerioAPI): string {
    const googleNewsSelectors = [
      "article h1",
      "[data-article-title]",
      ".article-title",
      ".news-article-title",
      "main h1",
      'h1[role="heading"]',
      ".content h1",
      '[aria-label*="제목"]',
      '[aria-label*="title"]',
    ];

    for (const selector of googleNewsSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const title = element.text().trim();
        if (title && title.length > 5 && !this.isMediaCompanyName(title)) {
          logInfo(`  구글 뉴스 제목 발견: ${selector} → "${title}"`);
          return title;
        }
      }
    }

    const allHeadings = $("h1, h2, h3").toArray();
    for (const heading of allHeadings) {
      const text = $(heading).text().trim();
      if (
        text.length > 10 &&
        text.length < 200 &&
        !this.isMediaCompanyName(text) &&
        !text.includes("구글") &&
        !text.includes("Google")
      ) {
        logInfo(`  패턴 매칭으로 제목 발견: "${text}"`);
        return text;
      }
    }

    logInfo("  구글 뉴스에서 적절한 제목을 찾을 수 없음");
    return "구글 뉴스 - 제목 추출 실패";
  }

  isMediaCompanyName(text: string): boolean {
    const mediaNames = [
      "매일경제",
      "매일 경제",
      "조선일보",
      "중앙일보",
      "동아일보",
      "한경닷컴",
      "한국경제",
      "연합뉴스",
      "경향신문",
      "한곜레",
      "서울신문",
      "문화일보",
      "스포츠조선",
      "이데일리",
      "MBC",
      "KBS",
      "SBS",
      "JTBC",
      "YTN",
      "TV조선",
      "Google",
      "구글",
      "News",
      "뉴스",
    ];

    return mediaNames.some((name) => text.includes(name));
  }

  extractAuthor($: cheerio.CheerioAPI): string {
    const selectors = [
      '[name="author"]',
      '[property="article:author"]',
      ".author",
      ".byline",
      '[rel="author"]',
      ".reporter",
      ".writer",
      ".journalist",
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const author = element.attr("content") || element.text();
        if (author && author.trim()) {
          return author.trim();
        }
      }
    }

    return "";
  }

  extractPublishDate($: cheerio.CheerioAPI): string {
    const selectors = [
      '[property="article:published_time"]',
      '[name="publishdate"]',
      "time[datetime]",
      ".publish-date",
      ".date",
      ".news-date",
      ".time",
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const date =
          element.attr("content") || element.attr("datetime") || element.text();
        if (date && date.trim()) {
          try {
            return new Date(date.trim()).toLocaleDateString("ko-KR");
          } catch (e) {
            return date.trim();
          }
        }
      }
    }

    return "";
  }

  extractDescription($: cheerio.CheerioAPI): string {
    const selectors = [
      '[property="og:description"]',
      '[name="description"]',
      '[name="twitter:description"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const desc = element.attr("content");
        if (desc && desc.trim()) {
          return desc.trim();
        }
      }
    }

    return "";
  }

  extractMetadata($: cheerio.CheerioAPI): Partial<GeneralArticleMetadata> {
    const metadata: Partial<GeneralArticleMetadata> = {};
    metadata.domain = $('meta[property="og:site_name"]').attr("content") || "";
    metadata.language =
      $("html").attr("lang") ||
      $('meta[property="og:locale"]').attr("content") ||
      "";
    metadata.keywords = $('meta[name="keywords"]').attr("content") || "";
    metadata.totalElements = $("*").length;
    metadata.paragraphs = $("p").length;
    metadata.images = $("img").length;
    metadata.links = $("a").length;
    return metadata;
  }

  calculateStats(text: string): GeneralArticleStats {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

    return {
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, "").length,
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      readingTimeMinutes: Math.ceil(words.length / 200),
      avgWordsPerSentence: Math.round(
        words.length / Math.max(sentences.length, 1)
      ),
      avgSentencesPerParagraph: Math.round(
        sentences.length / Math.max(paragraphs.length, 1)
      ),
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logInfo("🔚 브라우저 연결 종료");
    }
  }
}
