import { Input, Output } from "../types/index.js";
export declare class NewsRssService {
    private readonly googleRssBaseUrl;
    private readonly validLanguages;
    private readonly validCountries;
    constructor();
    /**
     * Process multiple requests defined in the input array.
     * @param inputParam - An array of input configurations.
     * @returns A promise that resolves to an array of output results, each corresponding to an input configuration.
     */
    getNewsRss(input: Input): Promise<Output>;
    /**
     * Fetches and parses Google News RSS feed for a single configuration.
     * Uses the search feed if a keyword is provided.
     * @param params - Object containing gl, hl, keyword (optional), and count (optional).
     * @returns Parsed news items (title, link).
     * @throws If an error occurs during fetching or parsing the RSS feed structure.
     */
    private fetchRss;
}
//# sourceMappingURL=newsRssService.d.ts.map