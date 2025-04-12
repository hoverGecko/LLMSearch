import puppeteer, { Browser, Page } from "puppeteer-core";
import chromium from '@sparticuz/chromium';
import axios from 'axios';
import * as cheerio from 'cheerio';

export default class WebScraper {
    // Keep the browser promise for lazy initialization of Puppeteer when needed
    protected browserInstance: Browser | null = null;
    protected browserPromise: Promise<Browser> | null = null;

    // --- Private Helper: Initialize Browser (only when needed) ---
    private async getBrowser(): Promise<Browser> {
        if (this.browserInstance) {
            return this.browserInstance;
        }
        if (this.browserPromise) {
            return this.browserPromise;
        }

        console.log("Initializing Puppeteer browser instance...");
        // Store the promise to prevent multiple launch attempts simultaneously
        this.browserPromise = new Promise(async (resolve, reject) => {
            try {
                // Ensure Chromium is prepared (downloads if needed in non-Lambda env)
                const executablePath = await chromium.executablePath(
                   // Check if we are in AWS Lambda environment
                   process.env.AWS_LAMBDA_FUNCTION_NAME
                    ? '/opt/nodejs/node_modules/@sparticuz/chromium/bin' // Path within the Layer
                    : undefined // Let chromium find it locally if not in Lambda
                );

                if (!executablePath) {
                     throw new Error("Chromium executable path could not be found.");
                }

                const browser = await puppeteer.launch({
                    args: chromium.args,
                    defaultViewport: chromium.defaultViewport,
                    executablePath: executablePath,
                    headless: chromium.headless, // Use the dynamic headless value
                });
                console.log("Puppeteer browser launched successfully.");
                this.browserInstance = browser; // Store the resolved instance
                this.browserPromise = null; // Clear the promise
                resolve(browser);
            } catch (error) {
                console.error("Failed to launch Puppeteer browser:", error);
                this.browserPromise = null; // Clear the promise on error
                reject(error);
            }
        });
        return this.browserPromise;
    }

    // --- Private Helper: Fast HTTP Fetch using Axios and Cheerio ---
    private async _fastFetch(url: string | URL, timeout: number): Promise<string | null> {
        console.log(`[Fast Fetch] Attempting for: ${url.toString()}`);
        try {
            const response = await axios.get(url.toString(), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36', // Mimic browser
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                },
                timeout: timeout,
            });

            if (response.status >= 200 && response.status < 300 && response.data) {
                console.log(`[Fast Fetch] Success for: ${url.toString()}`);
                return response.data; // Return raw HTML
            } else {
                console.warn(`[Fast Fetch] Non-2xx status (${response.status}) for: ${url.toString()}`);
                return null;
            }
        } catch (error: any) {
            console.error(`[Fast Fetch] Error for ${url.toString()}: ${error.message}`);
            return null; // Network error, timeout, etc.
        }
    }

    // --- Private Helper: Heuristic to check if content looks sufficient ---
    private _isContentSufficient(text: string | null | undefined): boolean {
        if (!text) return false;

        // 1. Minimum length (adjust as needed)
        if (text.length < 150) {
            console.log(`[Heuristic] Content too short (${text.length} chars).`);
            return false;
        }
        // 2. Check for common "JavaScript required" patterns
        const jsRequiredPatterns = [
            /enable javascript/i,
            /javascript is required/i,
            /requires javascript/i,
            /<noscript>/i,
        ];
        if (jsRequiredPatterns.some(pattern => pattern.test(text))) {
             console.log("[Heuristic] Detected 'JavaScript required' pattern.");
             return false;
        }

        console.log(`[Heuristic] Content length (${text.length}) and pattern checks passed.`);
        return true;
    }

    // --- Private Helper: Extract Plain Text using Cheerio ---
    private _extractTextWithCheerio(html: string): string | null {
         try {
            const $ = cheerio.load(html);
            // Remove script/style tags for cleaner text extraction
            $('script, style, noscript, link[rel="stylesheet"], header, footer, nav, img').remove(); // Remove common non-content areas
            let text = $('body').text();
            text = text?.replace(/\s\s+/g, ' ').trim(); // Basic whitespace cleanup
            return text || null;
         } catch (parseError) {
            console.error("[Cheerio] Error parsing HTML:", parseError);
            return null;
         }
    }


    // --- Private Helper: Heavy Fetch using Puppeteer ---
    private async _heavyFetch(url: string | URL, timeout: number): Promise<string | null> {
        console.log(`[Heavy Fetch] Using Puppeteer for: ${url.toString()}`);
        let page: Page | null = null;
        try {
            const browser = await this.getBrowser(); // Ensure browser is initialized
            page = await browser.newPage();
            // Set a slightly longer User-Agent for Puppeteer if desired
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36');

            await page.goto(url.toString(), { waitUntil: 'networkidle2', timeout: timeout });

            // Extract *plain text* content
            const textContent = await page.evaluate(() => {
                // Optional: Remove elements directly in the browser context if needed
                document.querySelectorAll('script, style, noscript, link[rel="stylesheet"], header, footer, nav').forEach(el => el.remove());
                return document.body?.innerText; // innerText often gives more human-readable text
            });

            console.log(`[Heavy Fetch] Success for: ${url.toString()}`);
            return textContent?.replace(/\s\s+/g, ' ').trim() || null; // Cleanup whitespace

        } catch (e: any) {
            console.error(`[Heavy Fetch] Error for ${url.toString()}: `, e.message);
            return null; // Return null on Puppeteer error
        } finally {
            if (page) {
                try {
                    await page.close();
                    console.log(`[Heavy Fetch] Page closed for: ${url.toString()}`);
                } catch (closeError: any) {
                     console.warn(`[Heavy Fetch] Failed to close page for ${url.toString()}: ${closeError.message}`);
                }
            }
        }
    }

    /**
     * Scrape a single URL and return the plaintext content using a hybrid approach.
     * Tries a fast HTTP fetch first, falls back to Puppeteer if necessary.
     * @param url URL of the webpage.
     * @param fastTimeout Timeout for the initial fast HTTP request (milliseconds). Default 5000ms.
     * @param heavyTimeout Timeout for the fallback Puppeteer navigation (milliseconds). Default 20000ms.
     * @returns Plain text string, or null if content extraction fails.
     */
    public async urlToPlainText(
        url: string | URL,
        fastTimeout: number = 5000,
        heavyTimeout: number = 20000
    ): Promise<string | null> {

        // 1. Attempt Fast Fetch
        const fastHtml = await this._fastFetch(url, fastTimeout);
        let plainText: string | null = null;

        if (fastHtml) {
             // 2. Extract text from fast fetch result
             plainText = this._extractTextWithCheerio(fastHtml);

             // 3. Apply Heuristic
             if (this._isContentSufficient(plainText)) {
                 console.log(`[Hybrid Logic] Using fast fetch result for: ${url.toString()}`);
                 return plainText; // Sufficient content found via fast method
             } else {
                 console.log(`[Hybrid Logic] Fast fetch content insufficient for ${url.toString()}. Falling back.`);
                 plainText = null; // Discard insufficient fast result
             }
        } else {
            console.log(`[Hybrid Logic] Fast fetch failed for ${url.toString()}. Falling back.`);
        }

        // 4. Fallback to Heavy Fetch (Puppeteer)
        // If fast fetch failed OR content was insufficient, use Puppeteer
        plainText = await this._heavyFetch(url, heavyTimeout);

        if (plainText) {
            console.log(`[Hybrid Logic] Using heavy fetch (Puppeteer) result for: ${url.toString()}`);
            return plainText;
        } else {
            console.error(`[Hybrid Logic] All methods failed for: ${url.toString()}`);
            return null; // Both methods failed
        }
    }

    /**
     * Scrape webpages with an array of URLs and return the plaintext content for each.
     * Uses the hybrid urlToPlainText method for each URL.
     * @param urls URLs of the webpages.
     * @param fastTimeout Timeout for the initial fast HTTP request per URL (milliseconds). Default 5000ms.
     * @param heavyTimeout Timeout for the fallback Puppeteer navigation per URL (milliseconds). Default 20000ms.
     * @returns Array of plain text strings or nulls.
     */
    public async urlsToPlainTexts(
        urls: (string | URL)[],
        fastTimeout: number = 5000,
        heavyTimeout: number = 20000
    ): Promise<(string | null)[]> {
        // Process URLs sequentially to potentially reuse the browser instance more effectively
        // If true parallelism is needed AND you are sure about resource limits, Promise.all can be used,
        // but beware of launching too many Puppeteer pages simultaneously.
        const results: (string | null)[] = [];
        for (const url of urls) {
            const result = await this.urlToPlainText(url, fastTimeout, heavyTimeout);
            results.push(result);
        }
        return results;

        // Alternative: Parallel execution (use with caution regarding resources)
        // return Promise.all(
        //     urls.map(url => this.urlToPlainText(url, fastTimeout, heavyTimeout))
        // );
    }

    /**
     * Optional: Explicitly close the browser instance if it was created.
     * Useful for cleanup at the end of a Lambda invocation if you keep the instance alive.
     */
    public async closeBrowser(): Promise<void> {
        if (this.browserInstance) {
             console.log("Closing shared Puppeteer browser instance.");
             await this.browserInstance.close();
             this.browserInstance = null;
             this.browserPromise = null; // Reset promises too
        }
    }
}

// Example Usage (within an async function/context):
/*
const scraper = new WebScraper();

async function runScrape() {
    try {
        const url1 = "https://httpbin.org/html"; // Simple static HTML
        const url2 = "https://pptr.dev/";     // JS-heavy site

        console.log("\n--- Scraping Static Site ---");
        const text1 = await scraper.urlToPlainText(url1);
        console.log("Result 1:", text1 ? text1.substring(0, 200) + '...' : 'null');

        console.log("\n--- Scraping Dynamic Site ---");
        const text2 = await scraper.urlToPlainText(url2);
        console.log("Result 2:", text2 ? text2.substring(0, 200) + '...' : 'null');

        console.log("\n--- Scraping Multiple ---");
        const results = await scraper.urlsToPlainTexts([url1, url2]);
        console.log("Multi Result 1:", results[0] ? results[0].substring(0, 100) + '...' : 'null');
        console.log("Multi Result 2:", results[1] ? results[1].substring(0, 100) + '...' : 'null');

    } catch (error) {
        console.error("Scraping failed:", error);
    } finally {
        await scraper.closeBrowser(); // Close browser when done with the scraper instance
    }
}

runScrape();
*/