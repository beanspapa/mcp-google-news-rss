import { parseStringPromise } from 'xml2js';
import fetch from 'node-fetch';
export class NewsRssService {
    constructor() {
        this.googleRssBaseUrl = 'https://news.google.com/rss';
        this.validLanguages = new Set([
            'ko', 'id', 'ms', 'ca', 'cs', 'de', 'et', 'en', 'es-419', 'es', 'fr', 'it', 'lv', 'lt', 'hu', 'nl', 'no', 'pl', 'pt-419', 'pt-150', 'ro', 'sk', 'sl', 'fi', 'sv', 'vi', 'tr', 'el', 'bg', 'ru', 'sr', 'uk', 'ja', 'zh-Hans', 'zh-Hant', 'he', 'ar', 'mr', 'hi', 'bn', 'pa', 'gu', 'ta', 'te', 'ml', 'th'
        ]);
        this.validCountries = new Set([
            'KR', 'ID', 'MY', 'ES', 'CZ', 'DE', 'AT', 'CH', 'EE', 'AU', 'BW', 'CA', 'ET', 'GH', 'IN', 'IE', 'IL', 'KE', 'LV', 'NA', 'NZ', 'NG', 'PK', 'PH', 'SG', 'ZA', 'TZ', 'UG', 'GB', 'US', 'ZW', 'AR', 'CL', 'CO', 'CU', 'MX', 'PE', 'VE', 'BE', 'FR', 'MA', 'SN', 'IT', 'LT', 'HU', 'NL', 'NO', 'PL', 'BR', 'PT', 'RO', 'SK', 'SI', 'FI', 'SE', 'VN', 'TR', 'GR', 'BG', 'RU', 'UA', 'RS', 'JP', 'CN', 'TW', 'HK', 'AE', 'SA', 'LB', 'EG', 'BD', 'TH'
        ]);
    }
    /**
     * Process multiple requests defined in the input array.
     * @param inputParam - An array of input configurations.
     * @returns A promise that resolves to an array of output results, each corresponding to an input configuration.
     */
    async getNewsRss(input) {
        const { gl, hl, keyword, count } = input; // Destructure a single input object from the array
        // Input validation
        if (!this.validLanguages.has(hl)) {
            console.error(`Invalid language code: ${hl}`); // Removed the extra console.error
            return {
                error: "Invalid language code"
            };
        }
        if (!this.validCountries.has(gl)) {
            console.error(`Invalid country code: ${gl}`); // Removed the extra console.error
            return {
                error: "Invalid contry code"
            };
        }
        if (count && count < 0) {
            console.error(`Invalid count: ${count}`); // Removed the extra console.error
            return {
                error: "Invalid count number"
            };
        }
        try {
            // Fetch and parse RSS for the current input configuration
            return await this.fetchRss({ gl, hl, keyword, count });
        }
        catch (error) { // Explicitly type error as any or unknown
            console.error(`Error fetching news RSS for gl=${gl}, hl=${hl}, keyword=${keyword}:`, error);
            // Return the object directly instead of pushing to an array for error handling
            return {
                error: error.message || "An unknown error occurred" // Include error message
            };
        }
    }
    /**
     * Fetches and parses Google News RSS feed for a single configuration.
     * Uses the search feed if a keyword is provided.
     * @param params - Object containing gl, hl, keyword (optional), and count (optional).
     * @returns Parsed news items (title, link).
     * @throws If an error occurs during fetching or parsing the RSS feed structure.
     */
    async fetchRss({ gl, hl, keyword, count }) {
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
        return limitedItems.map((item) => {
            if (!item || typeof item.title !== 'string' || typeof item.link !== 'string') {
                console.warn("Skipping item due to unexpected structure or missing title/link:", item);
                return null;
            }
            return {
                title: item.title,
                link: item.link
            };
        }).filter((item) => item !== null); // Filter out nulls and cast
    }
}
