
import { parseStringPromise } from 'xml2js';
import { Input, Output } from "../types";
import fetch from 'node-fetch';

export class NewsRssService {

    private readonly googleRssBaseUrl = 'https://news.google.com/rss';

    private readonly validLanguages = new Set([
        'ko', 'id', 'ms', 'ca', 'cs', 'de', 'et', 'en', 'es-419', 'es', 'fr', 'it', 'lv', 'lt', 'hu', 'nl', 'no', 'pl', 'pt-419', 'pt-150', 'ro', 'sk', 'sl', 'fi', 'sv', 'vi', 'tr', 'el', 'bg', 'ru', 'sr', 'uk', 'ja', 'zh-Hans', 'zh-Hant', 'he', 'ar', 'mr', 'hi', 'bn', 'pa', 'gu', 'ta', 'te', 'ml', 'th'
    ]);

    private readonly validCountries = new Set([
        'KR', 'ID', 'MY', 'ES', 'CZ', 'DE', 'AT', 'CH', 'EE', 'AU', 'BW', 'CA', 'ET', 'GH', 'IN', 'IE', 'IL', 'KE', 'LV', 'NA', 'NZ', 'NG', 'PK', 'PH', 'SG', 'ZA', 'TZ', 'UG', 'GB', 'US', 'ZW', 'AR', 'CL', 'CO', 'CU', 'MX', 'PE', 'VE', 'BE', 'FR', 'MA', 'SN', 'IT', 'LT', 'HU', 'NL', 'NO', 'PL', 'BR', 'PT', 'RO', 'SK', 'SI', 'FI', 'SE', 'VN', 'TR', 'GR', 'BG', 'RU', 'UA', 'RS', 'JP', 'CN', 'TW', 'HK', 'AE', 'SA', 'LB', 'EG', 'BD', 'TH'
    ]);

    constructor() {
    }

    /**
     * Process multiple requests defined in the input array.
     * @param inputParam - An array of input configurations.
     * @returns A promise that resolves to an array of output results, each corresponding to an input configuration.
     */
    async getNewsRss(input: Input): Promise<Output> {
        const results: Output = {};

        // Iterate over each input configuration in the array

        const { gl, hl, keyword, count } = input; // Destructure a single input object from the array

        // Input validation
        if (!this.validLanguages.has(hl)) {
            console.error(`Invalid language code: ${hl}`);
                results.hl = hl;
                hl: hl,
                gl: gl,
                count: count || 5,
                keyword: keyword || '',
                articles: [], // Return empty articles array for invalid input
                error: `Invalid language code: ${hl}` // Add an error property
            });
        }

        if (!this.validCountries.has(gl)) {
                console.error(`Invalid country code: ${gl}`);
                results.push({
                hl: hl,
                gl: gl,
                count: count || 5,
                keyword: keyword || '',
                articles: [], // Return empty articles array for invalid input
                error: `Invalid country code: ${gl}` // Add an error property
            });
            continue; // Skip to the next input configuration
        }

        try {
            // Fetch and parse RSS for the current input configuration
            const newsItems = await this.fetchRss({ gl, hl, keyword, count });

            // Add the result for this configuration to the results array, matching the Output type
            results.push({
                hl: hl,
                gl: gl,
                count: count || 5, // Use default if count is not provided
                keyword: keyword || '', // Include keyword, default to empty string if not provided
                articles: newsItems // The fetched articles array
            });

        } catch (error: any) { // Explicitly type error as any or unknown
            console.error(`Error fetching news RSS for gl=${gl}, hl=${hl}, keyword=${keyword}:`, error);
            // Handle errors for individual items by adding an entry with empty articles and error info
                results.push({
                hl: hl,
                gl: gl,
                count: count || 5,
                keyword: keyword || '',
                articles: [], // Return empty articles array on error for this item
                error: error.message || "An unknown error occurred" // Include error message
            });
        }
        

        return results; // Return the array of results
    }

    /**
     * Fetches and parses Google News RSS feed for a single configuration.
     * Uses the search feed if a keyword is provided.
     * @param params - Object containing gl, hl, keyword (optional), and count (optional).
     * @returns Parsed news items (title, link).
     * @throws If an error occurs during fetching or parsing the RSS feed structure.
     */
    private async fetchRss({ gl, hl, keyword, count }: { gl: string, hl: string, keyword?: string, count?: number }) {
        let url = `${this.googleRssBaseUrl}?hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`;

        if (keyword) {
            url = `${this.googleRssBaseUrl}/search?q=${encodeURIComponent(keyword)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`;
        }

        console.log(`Fetching RSS from: ${url}`);

        const xml = await fetch(url).then(res => res.text());

        // Parse XML data
        const data = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });

        // Check for expected RSS structure and handle cases with no items
        if (!data || !data.rss || !data.rss.channel) {
             throw new Error("Could not parse RSS feed: Missing channel");
        }

        // If channel.item is missing or empty, return an empty array
        if (!data.rss.channel.item) {
            console.log("No items found in RSS feed.");
            return [];
        }

        // Ensure items is always an array, even if there's only one item
         const items = Array.isArray(data.rss.channel.item) ? data.rss.channel.item : [data.rss.channel.item].filter(item => item !== undefined);

        // Limit results by count
        const limitedItems = count !== undefined ? items.slice(0, count) : items;

        // Map items to the desired { title, link } format, filtering out invalid items
        return limitedItems.map((item: any) => {
            if (!item || typeof item.title !== 'string' || typeof item.link !== 'string') {
                console.warn("Skipping item due to unexpected structure or missing title/link:", item);
                return null;
            }
             return {
                title: item.title,
                link: item.link
             };
        }).filter((item: any) => item !== null) as { title: string, link: string }[]; // Filter out nulls and cast
    }
}
