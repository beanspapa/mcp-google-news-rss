export interface ArticleStatsBase {
  characters: number;
  words: number;
  readingTimeMinutes: number;
  sentences?: number;
  paragraphs?: number;
  charactersNoSpaces?: number;
}

export interface ArticleMetadataBase {
  sourceUrl: string;
  extractionMethod: string;
  timestamp: string;
  domain?: string;
  language?: string;
  keywords?: string;
  totalElements?: number; // From GeneralExtractor
  detectedCharset?: string; // From NaverExtractor
  // Fields from GoogleNewsExtractor
  finalUrl?: string;
  extractedFrom?: string;
  originalUrl?: string;
  extractorType?: string;
  extractionSuccess?: boolean;
  attempts?: number;
  useReadability?: boolean;
  contentLength?: number;
  // Fields from NaverExtractor
  oid?: string;
  aid?: string;
  naverSpecific?: any;
  // Fields from GeneralExtractor (some might overlap or be generic enough)
  paragraphs?: number; // This was also in ArticleStatsBase, ensure consistency
  images?: number;
  links?: number;
}

export interface ExtractedArticleBase {
  title: string;
  content: string;
  author: string;
  publishDate: string | null;
  sourceUrl: string; // Kept for consistency, though also in ArticleMetadataBase
  description?: string;
  stats?: ArticleStatsBase; // To be made specific if needed
  metadata?: ArticleMetadataBase; // To be made specific if needed
  extractionMethod?: string; // Also in ArticleMetadataBase, ensure consistency
  performance?: {
    extractionTime: number;
    method: string;
  };
}

// --- Unified Extractor Specific Types ---
export interface UnifiedExtractedArticle extends ExtractedArticleBase {
  unified?: {
    detectedSite: string;
    extractorUsed: string;
    totalExtractionTime: number;
    url: string;
    timestamp: string;
    metadata?: any; // Consider making this more specific, e.g., Partial<ArticleMetadataBase>
    fallbackReason?: string;
  };
}

export interface Extractor {
  extract(
    url: string,
    options?: any
  ): Promise<
    | ExtractedArticleBase
    | ExtractedGoogleArticle
    | ExtractedNaverArticle
    | ExtractedGeneralArticle
    | null
  >; // Allow returning any of the specific extracted articles or null
  close?(): Promise<void>; // Optional close method
}

export interface ExtractorMappingValue {
  extractor: Extractor;
  name: string;
}

export interface ExtractorMapping {
  [key: string]: ExtractorMappingValue;
}

export interface UnifiedNewsExtractorOptions {
  // Add options if needed in the future
}

// --- Google Specific (if any deviations or additions) ---
export interface GoogleArticleStats extends ArticleStatsBase {}
export interface GoogleArticleMetadata extends ArticleMetadataBase {
  // originalGoogleUrl: string; // This seems unique to google extracted article not just metadata
}
export interface ExtractedGoogleArticle extends ExtractedArticleBase {
  originalGoogleUrl: string; // Unique to Google
  stats?: GoogleArticleStats;
  metadata?: GoogleArticleMetadata;
}
export interface GoogleNewsExtractorOptions {
  useReadability?: boolean;
  enableMarkdown?: boolean;
  maxRetries?: number;
  timeout?: number;
  navigationTimeout?: number;
  waitForContent?: number;
  verbose?: boolean;
  blockResources?: boolean;
  simulateHuman?: boolean;
  proxy?: { server: string; username?: string; password?: string };
  rateLimit?: number;
}

// --- Naver Specific (if any deviations or additions) ---
export interface NaverArticleStats extends ArticleStatsBase {}
export interface NaverArticleMetadata extends ArticleMetadataBase {
  // oid?: string; // Already in ArticleMetadataBase
  // aid?: string; // Already in ArticleMetadataBase
  // naverSpecific?: any; // Already in ArticleMetadataBase
}
export interface ExtractedNaverArticle extends ExtractedArticleBase {
  stats?: NaverArticleStats;
  metadata?: NaverArticleMetadata;
}
export interface NaverNewsExtractorOptions {
  preferDesktopView?: boolean;
}

// --- General Specific (if any deviations or additions) ---
export interface GeneralArticleStats extends ArticleStatsBase {
  avgWordsPerSentence?: number;
  avgSentencesPerParagraph?: number;
}
export interface GeneralArticleMetadata extends ArticleMetadataBase {}

export interface ExtractedGeneralArticle extends ExtractedArticleBase {
  stats?: GeneralArticleStats;
  metadata?: GeneralArticleMetadata;
  // GeneralExtractor 특화 필드가 있다면 추가
}

// --- Other specific types that might be useful globally or are repeated ---
export interface ViewportSize {
  width: number;
  height: number;
}

export interface ParsedReadabilityArticle {
  title?: string | null;
  content: string;
  textContent?: string | null;
  author?: string | null;
  byline?: string | null;
  publishedTime?: string | null;
  length?: number | null;
  excerpt?: string | null;
}

export interface SmartExtractionResult {
  title: string;
  content: string;
  author: string;
  publishDate: string;
}

// Options for General Extractor
export interface FetchOptions {
  forcePlaywright?: boolean;
}

export interface SSRResult {
  success: boolean;
  method?: string;
  data?: string;
}

// Type for realistic headers used in GoogleNewsRedirectExtractor
export interface RealisticHeaders {
  [header: string]: string;
}

// Types for simulated browser environment in GoogleNewsRedirectExtractor
export interface SimulatedPluginMimeType {
  type: string;
  suffixes: string;
  description: string;
}

export interface SimulatedPlugin {
  name: string;
  filename: string;
  description: string;
  // For properties like '0', '1', etc.
  [index: number]: SimulatedPluginMimeType;
}
