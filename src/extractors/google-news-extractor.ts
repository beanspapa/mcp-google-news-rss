import {
  chromium,
  Browser,
  BrowserContext,
  Page,
  Route,
  LaunchOptions,
} from "playwright-chromium";
import {
  ExtractedGoogleArticle,
  GoogleArticleStats,
  GoogleArticleMetadata,
  GoogleNewsExtractorOptions,
  ViewportSize,
  ParsedReadabilityArticle,
  SmartExtractionResult,
  RealisticHeaders,
  SimulatedPlugin,
  SimulatedPluginMimeType,
} from "./types.js"; // Centralized types

/**
 * 향상된 구글 뉴스 콘텐츠 추출기
 * Playwright 기반으로 봇 감지 우회 및 안정적인 콘텐츠 추출
 */

export class GoogleNewsRedirectExtractor {
  private browser: Browser | null;
  private context: BrowserContext | null;
  private options: GoogleNewsExtractorOptions;
  private userAgents: string[];
  private viewports: ViewportSize[];
  private requestTimes: number[];
  private turndownService: any;
  private JSDOM: any;
  private Readability: any;

  constructor(options: GoogleNewsExtractorOptions = {}) {
    this.browser = null;
    this.context = null;
    this.options = {
      useReadability: true,
      enableMarkdown: false,
      maxRetries: 3,
      timeout: 45000,
      navigationTimeout: 30000,
      waitForContent: 5000,
      verbose: false,
      blockResources: true,
      simulateHuman: true,
      proxy: undefined,
      rateLimit: 10,
      ...options,
    };

    this.userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
    ];
    this.viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
    ];
    this.requestTimes = [];

    // Dynamically import and assign if in Node.js environment for these libraries
    if (typeof window === "undefined") {
      import("turndown")
        .then(
          (module) =>
            (this.turndownService = new module.default({
              headingStyle: "atx",
              codeBlockStyle: "fenced",
            }))
        )
        .catch((err) => console.error("Failed to load turndown", err));
      import("jsdom")
        .then((module) => (this.JSDOM = module.JSDOM))
        .catch((err) => console.error("Failed to load jsdom", err));
      import("@mozilla/readability")
        .then((module) => (this.Readability = module.Readability))
        .catch((err) => console.error("Failed to load readability", err));
    } else {
      // In browser environment, these might be globally available or handled differently
      // For now, this example focuses on Node.js server-side usage
      this.turndownService = null;
      this.JSDOM = null;
      this.Readability = null;
    }
  }

  /**
   * 브라우저 초기화
   */
  private async _initBrowser(): Promise<BrowserContext> {
    if (!this.browser || !this.browser.isConnected()) {
      if (this.browser) await this.browser.close();
      this._logVerbose("🚀 Playwright 브라우저 초기화...");

      const viewport = this._getRandomViewport();
      const launchOptions: LaunchOptions = {
        headless: true,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-features=VizDisplayCompositor",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-web-security",
          "--disable-features=site-per-process",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-default-apps",
          "--disable-popup-blocking",
          "--disable-translate",
          "--disable-background-timer-throttling",
          "--disable-renderer-backgrounding",
          "--disable-backgrounding-occluded-windows",
          "--disable-ipc-flooding-protection",
          "--disable-extensions",
          "--disable-plugins",
          "--disable-images",
          `--window-size=${viewport.width},${viewport.height}`,
        ],
      };

      if (this.options.proxy && this.options.proxy.server) {
        launchOptions.proxy = this.options.proxy;
        this._logVerbose(`🌐 프록시 사용: ${this.options.proxy.server}`);
      }

      this.browser = await chromium.launch(launchOptions);
      this.browser.on("disconnected", () => {
        this._logVerbose("👻 Playwright 브라우저 연결 끊김");
        this.browser = null;
        this.context = null;
      });
    }

    if (!this.context || !this.context.pages().length) {
      const viewport = this._getRandomViewport();
      if (!this.browser) {
        // Ensure browser is initialized
        throw new Error("Browser not initialized before creating context.");
      }
      this.context = await this.browser.newContext({
        viewport,
        userAgent: this._getRandomUserAgent(),
        locale: "ko-KR",
        timezoneId: "Asia/Seoul",
        deviceScaleFactor: Math.random() > 0.5 ? 1 : 2,
        screen: viewport,
        colorScheme: "light",
        javaScriptEnabled: true,
        acceptDownloads: false,
        hasTouch: Math.random() > 0.5,
        isMobile: Math.random() > 0.3,
        extraHTTPHeaders: this._generateRealisticHeaders(),
      });
      await this._injectAdvancedStealth(this.context);
    }
    return this.context;
  }

  private _getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private _getRandomViewport(): ViewportSize {
    return this.viewports[Math.floor(Math.random() * this.viewports.length)];
  }

  private _generateRealisticHeaders(): RealisticHeaders {
    return {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
      "sec-ch-ua":
        '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    };
  }

  private async _injectAdvancedStealth(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

      (window as any).chrome = {
        runtime: {},
        loadTimes: function () {
          return {
            commitLoadTime: Date.now() / 1000 - Math.random(),
            finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
            finishLoadTime: Date.now() / 1000 - Math.random(),
            firstPaintAfterLoadTime: 0,
            firstPaintTime: Date.now() / 1000 - Math.random(),
            navigationType: "Other",
            numTabsInSession: Math.floor(Math.random() * 10) + 1,
            requestTime: Date.now() / 1000 - Math.random(),
            startLoadTime: Date.now() / 1000 - Math.random(),
          };
        },
        csi: function () {
          return {
            onloadT: Date.now(),
            pageT: Math.random() * 1000,
            tran: Math.floor(Math.random() * 20),
          };
        },
        app: {},
      };

      Object.defineProperty(navigator, "plugins", {
        get: (): SimulatedPlugin[] => [
          {
            0: {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
            },
            name: "Chrome PDF Plugin",
            filename: "internal-pdf-viewer",
            description: "Portable Document Format",
          },
          {
            0: {
              type: "application/pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
            },
            name: "Chrome PDF Viewer",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            description: "Portable Document Format",
          },
          {
            0: {
              type: "application/x-nacl",
              suffixes: "",
              description: "Native Client Executable",
            },
            name: "Native Client",
            filename: "internal-nacl-plugin",
            description: "Native Client",
          },
        ],
      });

      Object.defineProperty(navigator, "languages", {
        get: function () {
          return ["ko-KR", "ko", "en-US", "en"];
        },
      });

      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({
              state: Notification.permission,
            } as unknown as PermissionStatus)
          : originalQuery(parameters);

      if ("getBattery" in navigator) {
        delete navigator.getBattery;
      }

      Object.defineProperty(navigator, "hardwareConcurrency", {
        get: function () {
          return 4 + Math.floor(Math.random() * 4);
        },
      });

      if ("deviceMemory" in navigator) {
        Object.defineProperty(navigator, "deviceMemory", {
          get: function () {
            return [4, 8, 16][Math.floor(Math.random() * 3)];
          },
        });
      }
    });
  }

  private async _simulateHumanBehavior(page: Page) {
    if (!this.options.simulateHuman) return;
    await page.mouse.move(Math.random() * 200 + 100, Math.random() * 200 + 100);
    await page.evaluate(() => {
      window.scrollTo(0, Math.random() * 500);
    });
    await page.waitForTimeout(1000 + Math.random() * 2000);
  }

  private async _waitForRedirection(
    page: Page,
    verbose: boolean
  ): Promise<string> {
    const startUrl = page.url();
    try {
      await page.waitForLoadState("networkidle", {
        timeout: this.options.navigationTimeout,
      });
      const finalUrl = page.url();
      if (finalUrl !== startUrl) {
        this._logVerbose(`🔄 리다이렉션 감지: ${startUrl} → ${finalUrl}`);
      }
      await page.waitForFunction(() => document.readyState === "complete", {
        timeout: 10000,
      });
      await page.waitForTimeout(this.options.waitForContent || 3000);
      return finalUrl;
    } catch (error) {
      if (verbose) {
        if (error instanceof Error) {
          this._logVerbose(`⚠️ 리다이렉션 대기 중 오류: ${error.message}`);
        } else {
          this._logVerbose(
            `⚠️ 리다이렉션 대기 중 알 수 없는 오류: ${String(error)}`
          );
        }
      }
      return page.url();
    }
  }

  private async _extractWithReadability(
    html: string,
    url: string
  ): Promise<ParsedReadabilityArticle | null> {
    if (!this.options.useReadability || !this.JSDOM || !this.Readability)
      return null;

    try {
      const dom = new this.JSDOM(html, { url });
      const reader = new this.Readability(dom.window.document, {
        debug: this.options.verbose,
        maxElemsToParse: 0,
        nbTopCandidates: 5,
        charThreshold: 500,
        classesToPreserve: ["highlight", "important"],
        keepClasses: false,
      });

      const article = reader.parse(); // This is ParsedReadabilityArticle by structure

      if (article && article.content) {
        this._logVerbose(
          `✅ Readability 추출 성공: ${article.title || "No title"}`
        );
        let content = article.content;

        if (this.options.enableMarkdown && this.turndownService) {
          content = this.turndownService.turndown(content);
        } else {
          // HTML 태그 제거 시 textContent 활용
          content = article.textContent || content.replace(/<[^>]*>/g, "");
        }

        return {
          title: article.title,
          content: content,
          textContent: article.textContent,
          author: article.byline, // Readability uses byline for author
          byline: article.byline,
          publishedTime: null, // Readability does not provide this consistently
          length: article.length,
          excerpt: article.excerpt,
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`⚠️ Readability 추출 실패: ${error.message}`);
      } else {
        console.warn(`⚠️ Readability 추출 실패: ${String(error)}`);
      }
    }
    return null;
  }

  private async _smartExtractContent(
    page: Page,
    verbose: boolean
  ): Promise<SmartExtractionResult> {
    return await page.evaluate((verboseEvaluate) => {
      const generateSelectors = (baseSelectors: string[]): string[] => {
        const variations = ["", "-content", "-body", "-text", "-main"];
        const prefixes = [
          "",
          "article-",
          "post-",
          "news-",
          "story-",
          "content-",
        ];
        const selectors: string[] = [...baseSelectors];
        for (const base of baseSelectors) {
          for (const prefix of prefixes) {
            for (const variation of variations) {
              selectors.push(`.${prefix}${base}${variation}`);
              selectors.push(`#${prefix}${base}${variation}`);
            }
          }
        }
        return [...new Set(selectors)];
      };

      const contentSelectors = generateSelectors([
        "article",
        "main",
        "content",
        "body",
        "text",
        "story",
        "post",
        "news",
        "entry",
        "excerpt",
      ]).concat([
        '[role="article"]',
        '[role="main"]',
        '[itemtype*="Article"]',
        '[class*="article"]',
        '[class*="content"]',
        '[class*="post"]',
      ]);

      const titleSelectors = [
        "h1",
        "h2",
        "h3",
        '[role="heading"]',
        ".title",
        ".headline",
        ".header",
        "#title",
        "#headline",
        "#header",
        '[class*="title"]',
        '[class*="headline"]',
      ];

      const scoreElement = (element: Element, isTitle = false): number => {
        let score = 0;
        const text = element.textContent?.trim() || "";
        const tagName = element.tagName.toLowerCase() as keyof typeof tagScores;

        if (isTitle) {
          if (text.length > 10 && text.length < 200) score += 10;
          if (text.length > 20 && text.length < 100) score += 5;
        } else {
          if (text.length > 100) score += text.length / 100;
          if (text.length > 500) score += 10;
        }

        const tagScores = {
          article: 15,
          main: 12,
          section: 8,
          div: 3,
          p: 5,
          h1: isTitle ? 15 : 0,
          h2: isTitle ? 12 : 0,
          h3: isTitle ? 8 : 0,
        } as const; // Added 'as const' for stricter typing of keys
        score += tagScores[tagName] || 0;

        const className = element.className.toLowerCase();
        const id = element.id.toLowerCase();
        const goodKeywords = isTitle
          ? ["title", "headline", "header"]
          : ["article", "content", "main", "post", "story", "body", "text"];
        const badKeywords = [
          "nav",
          "menu",
          "sidebar",
          "footer",
          "header",
          "ad",
          "comment",
          "social",
          "share",
          "related",
          "recommend",
        ];
        for (const keyword of goodKeywords)
          if (className.includes(keyword) || id.includes(keyword)) score += 8;
        for (const keyword of badKeywords)
          if (className.includes(keyword) || id.includes(keyword)) score -= 10;
        return score;
      };

      let bestTitle = "";
      let bestTitleScore = -Infinity;
      for (const selector of titleSelectors) {
        try {
          document.querySelectorAll(selector).forEach((element) => {
            const score = scoreElement(element, true);
            if (score > bestTitleScore) {
              bestTitleScore = score;
              bestTitle = element.textContent?.trim() || "";
            }
          });
        } catch (e) {
          if (verboseEvaluate) console.log(`제목 선택자 오류: ${selector}`, e);
        }
      }

      let bestContent = "";
      let bestContentScore = -Infinity;
      for (const selector of contentSelectors) {
        try {
          document.querySelectorAll(selector).forEach((element) => {
            const cloned = element.cloneNode(true) as Element;
            const unwantedSelectors = [
              "script",
              "style",
              "iframe",
              "noscript",
              "nav",
              ".ad",
              ".advertisement",
              ".banner",
              ".social",
              ".share",
              ".comment",
              ".navigation",
              ".menu",
              ".sidebar",
              ".footer",
              ".header",
              ".related",
              '[class*="ad"]',
              '[id*="ad"]',
              '[class*="social"]',
            ];
            unwantedSelectors.forEach((unwanted) =>
              cloned.querySelectorAll(unwanted).forEach((el) => el.remove())
            );
            const cleanText = cloned.textContent?.trim() || "";
            const score = scoreElement(cloned, false);
            if (score > bestContentScore && cleanText.length > 100) {
              bestContentScore = score;
              bestContent = cleanText;
            }
          });
        } catch (e) {
          if (verboseEvaluate)
            console.log(`콘텐츠 선택자 오류: ${selector}`, e);
        }
      }

      const meta: { author?: string; publishDate?: string } = {};
      const authorSelectors = [
        '[rel="author"]',
        ".author",
        ".byline",
        ".writer",
        '[class*="author"]',
        '[id*="author"]',
        '[itemtype*="Person"]',
      ];
      for (const selector of authorSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element && element.textContent?.trim()) {
            meta.author = element.textContent.trim();
            break;
          }
        } catch (e) {
          /* ignore */
        }
      }

      const dateSelectors = [
        "time",
        "[datetime]",
        ".date",
        ".published",
        ".timestamp",
        '[class*="date"]',
        '[id*="date"]',
        '[class*="time"]',
      ];
      for (const selector of dateSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            const datetime =
              element.getAttribute("datetime") ||
              element.getAttribute("content") ||
              element.textContent?.trim();
            if (datetime) {
              meta.publishDate = datetime;
              break;
            }
          }
        } catch (e) {
          /* ignore */
        }
      }

      if (verboseEvaluate) {
        console.log(
          `📊 제목 점수: ${bestTitleScore}, 콘텐츠 점수: ${bestContentScore}`
        );
        console.log(`📝 제목: "${bestTitle.substring(0, 50)}..."`);
        console.log(`📄 콘텐츠 길이: ${bestContent.length}자`);
      }

      return {
        title: bestTitle || document.title || "No title found",
        content: bestContent || "No content found",
        author: meta.author || "",
        publishDate: meta.publishDate || "",
      };
    }, this.options.verbose);
  }

  private async _applyRateLimit(requestsPerMinute: number = 10) {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter((time) => now - time < 60000);
    if (this.requestTimes.length >= requestsPerMinute) {
      const waitTime = 60000 - (now - this.requestTimes[0]) + 1000;
      this._logVerbose(
        `⏳ 레이트 리미트 적용, ${Math.round(waitTime / 1000)}초 대기...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.requestTimes.push(now);
  }

  async extract(
    googleNewsUrl: string,
    options: GoogleNewsExtractorOptions = {}
  ): Promise<ExtractedGoogleArticle | null> {
    const mergedOptions = { ...this.options, ...options };
    this._logVerbose("🔗 구글 뉴스 콘텐츠 추출 시작 (최종 버전)...");

    if (mergedOptions.rateLimit !== undefined) {
      await this._applyRateLimit(mergedOptions.rateLimit);
    }

    const maxRetries = mergedOptions.maxRetries ?? 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let page: Page | null = null;
      try {
        const context = await this._initBrowser();
        page = await context.newPage();

        if (mergedOptions.blockResources) {
          await page.route("**/*", async (route: Route) => {
            const resourceType = route.request().resourceType();
            const url = route.request().url();
            if (
              ["image", "stylesheet", "font", "media"].includes(resourceType) ||
              url.includes("googleadservices") ||
              url.includes("googlesyndication") ||
              url.includes("google-analytics") ||
              url.includes("googletagmanager")
            ) {
              await route.abort();
            } else {
              await route.continue();
            }
          });
        }

        this._logVerbose(`🌐 페이지 로드 시도 ${attempt}/${maxRetries}...`);
        await page.goto(googleNewsUrl, {
          waitUntil: "domcontentloaded",
          timeout: mergedOptions.timeout,
        });

        await this._simulateHumanBehavior(page);
        const finalUrl = await this._waitForRedirection(
          page,
          mergedOptions.verbose || false
        );
        const html = await page.content();

        let extractedData:
          | ParsedReadabilityArticle
          | SmartExtractionResult
          | null = null;
        extractedData = await this._extractWithReadability(html, finalUrl);

        if (
          !extractedData ||
          !extractedData.content ||
          extractedData.content.length < 100
        ) {
          this._logVerbose(
            "🔄 Readability 실패 또는 내용 부족, 스마트 추출 사용..."
          );
          const smartData = await this._smartExtractContent(
            page,
            mergedOptions.verbose || false
          );
          extractedData = {
            title: smartData.title,
            content: smartData.content,
            author: smartData.author,
            publishedTime: smartData.publishDate,
            length: smartData.content.length,
          };
        }

        if (page) await page.close();
        page = null;

        if (
          extractedData &&
          extractedData.content &&
          extractedData.content.length > 100
        ) {
          this._logVerbose(
            `✅ 콘텐츠 추출 성공 (${extractedData.content.length}자, 시도: ${attempt})`
          );
          const cleanContent = this._cleanText(extractedData.content);
          const description =
            cleanContent.substring(0, 200) +
            (cleanContent.length > 200 ? "..." : "");

          return {
            title: this._cleanText(extractedData.title || "제목 없음"),
            content: cleanContent,
            author: this._cleanText(
              extractedData.author ||
                (extractedData as ParsedReadabilityArticle).byline ||
                ""
            ),
            publishDate: extractedData.publishedTime || "",
            sourceUrl: finalUrl,
            originalGoogleUrl: googleNewsUrl,
            description,
            stats: this._calculateStats(cleanContent) as GoogleArticleStats,
            metadata: {
              finalUrl,
              extractedFrom: mergedOptions.useReadability
                ? "Playwright+Readability"
                : "Playwright+SmartExtract",
              timestamp: new Date().toISOString(),
              originalUrl: googleNewsUrl,
              extractorType: "enhanced-google-news",
              extractionSuccess: true,
              attempts: attempt,
              useReadability: mergedOptions.useReadability,
              contentLength: extractedData.length || cleanContent.length,
            } as GoogleArticleMetadata,
          } as ExtractedGoogleArticle;
        }
        throw new Error(
          `콘텐츠 추출 실패 - 길이: ${extractedData?.content?.length || 0}`
        );
      } catch (error) {
        if (page) {
          try {
            await page.close();
          } catch (e) {
            /* ignore */
          }
        }

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`❌ 시도 ${attempt} 실패: ${errorMessage}`);

        if (attempt === maxRetries) {
          return null;
        }

        const delay = Math.min(
          2000 * Math.pow(2, attempt - 1) + Math.random() * 1000,
          15000
        );
        this._logVerbose(`🔄 ${Math.round(delay / 1000)}초 후 재시도...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return null;
  }

  private _cleanText(text: string): string {
    if (!text) return "";
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private _calculateStats(content: string): GoogleArticleStats {
    const words = content.split(/\s+/).filter(Boolean).length;
    const sentences = content.split(/[.!?]+/).filter(Boolean).length;
    const paragraphs = content.split(/\n\s*\n/).filter(Boolean).length;
    const characters = content.length;
    const charactersNoSpaces = content.replace(/\s/g, "").length;
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

  async close() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this._logVerbose("🔚 브라우저 및 컨텍스트 종료됨");
  }

  static createRateLimitedExtractor(
    requestsPerMinute = 10,
    options: GoogleNewsExtractorOptions = {}
  ) {
    return new GoogleNewsRedirectExtractor({
      ...options,
      rateLimit: requestsPerMinute,
    });
  }

  private _logVerbose(message: string, ...args: any[]): void {
    if (this.options.verbose) {
      console.log(`[VERBOSE] ${message}`, ...args);
    }
  }
}
