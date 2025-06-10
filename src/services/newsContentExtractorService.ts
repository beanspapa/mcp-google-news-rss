import { UnifiedNewsExtractor } from "../extractors/unified-extractor.js";
import { UnifiedExtractedArticle } from "../extractors/types.js";

export interface NewsContentInput {
  title: string;
  link: string;
  pubDate?: string;
}

export interface NewsContentOutput {
  title: string;
  link: string; // 실제 기사 주소
  publishDate?: string;
  content: string;
  author?: string;
  description?: string;
  extractionSuccess: boolean;
}

export class NewsContentExtractorService {
  async extractContents(
    items: NewsContentInput[]
  ): Promise<NewsContentOutput[]> {
    const extractor = new UnifiedNewsExtractor({
      timeout: 30000,
      maxRetries: 2,
    });
    const results: NewsContentOutput[] = [];

    for (const item of items) {
      try {
        const extracted = await extractor.extract(item.link);
        if (extracted && extracted.content) {
          results.push({
            title: extracted.title || item.title,
            link: extracted.sourceUrl,
            publishDate: extracted.publishDate || item.pubDate,
            content: extracted.content,
            author: extracted.author,
            description: extracted.description,
            extractionSuccess: true,
          });
        } else {
          results.push({
            title: item.title,
            link: item.link,
            publishDate: item.pubDate,
            content: "내용 추출에 실패했습니다.",
            author: undefined,
            description: undefined,
            extractionSuccess: false,
          });
        }
      } catch (e) {
        results.push({
          title: item.title,
          link: item.link,
          publishDate: item.pubDate,
          content: `추출 오류: ${e instanceof Error ? e.message : String(e)}`,
          author: undefined,
          description: undefined,
          extractionSuccess: false,
        });
      }
    }
    await extractor.closeAll();
    return results;
  }
}
