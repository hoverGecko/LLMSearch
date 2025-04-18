import puppeteer, { Browser, Page } from "puppeteer-core";
import chromium from '@sparticuz/chromium';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Scrap web content with urlToPlainText().
 * Tries to directly fetch website with GET first. 
 * If the fetched content indicates JavaScript is needed to load the webpage,
 * use Chromium with Puppeteer to load the webpage.
 * Return the body text content.
 */
export default class WebScraper {
    private browser: Promise<Browser> | null = null;

    private async getBrowser(): Promise<Browser> {
        if (this.browser) {
            return this.browser;
        }
        console.log("Initializing Puppeteer browser instance...");
        // Store the browser to prevent multiple launch attempts simultaneously
        this.browser = new Promise(async (resolve, reject) => {
            try {
                // check if chromium exists
                const executablePath = await chromium.executablePath();
                if (!executablePath) {
                     throw new Error("Chromium executable path could not be found by @sparticuz/chromium.");
                }
                const launchedBrowser = await puppeteer.launch({
                    args: chromium.args,
                    defaultViewport: chromium.defaultViewport,
                    executablePath: executablePath,
                    headless: chromium.headless
                });
                console.log("Puppeteer browser launched successfully.");
                resolve(launchedBrowser);
            } catch (error) {
                console.error("Failed to launch Puppeteer browser:", error);
                reject(error);
            }
        });
        return this.browser;
    }

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
             // e.g. Network error
            console.error(`[Fast Fetch] Error for ${url.toString()}: ${error.message}`);
            return null;
        }
    }

    // Check if directly fetched content is sufficient with heuristics
    // If not, use heavy fetch with Puppeteer
    private _isContentSufficient(text: string | null | undefined): boolean {
        if (!text) return false;
        // Check if length of text is too short
        if (text.length < 150) {
            console.log(`[Heuristic] Content too short (${text.length} chars).`);
            return false;
        }
        // Check for "JavaScript required" patterns
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

    private _extractTextWithCheerio(html: string): string | null {
         try {
            const $ = cheerio.load(html);
            // Remove common non-bodytext areas
            $('script, style, noscript, link[rel="stylesheet"], header, footer, nav, img').remove();
            let text = $('body').text();
            text = text?.replace(/\s\s+/g, ' ').trim(); // Whitespace cleanup
            return text || null;
         } catch (parseError) {
            console.error("[Cheerio] Error parsing HTML:", parseError);
            return null;
         }
    }

    // Use Puppeteer to load webpage content with JS
    private async _heavyFetch(url: string | URL, timeout: number): Promise<string | null> {
        console.log(`[Heavy Fetch] Using Puppeteer for: ${url.toString()}`);
        let page: Page | null = null;
        try {
            const browser = await this.getBrowser(); // Ensure browser is initialized
            page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36');

            await page.goto(url.toString(), { waitUntil: 'networkidle2', timeout: timeout });

            // Extract body text content
            const textContent = await page.evaluate(() => {
                document.querySelectorAll('script, style, noscript, link[rel="stylesheet"], header, footer, nav').forEach(el => el.remove());
                return document.body?.innerText;
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
     * @returns Plaintext string, or null if content extraction fails.
     */
    public async urlToPlainText(
        url: string | URL,
        fastTimeout: number = 5000,
        heavyTimeout: number = 20000
    ): Promise<string | null> {
        // Attempt Fast Fetch
        const fastHtml = await this._fastFetch(url, fastTimeout);
        let plainText: string | null = null;

        if (fastHtml) {
             // Extract text from fast fetch result
             plainText = this._extractTextWithCheerio(fastHtml);

             // If fetch result is sufficient, return text
             if (this._isContentSufficient(plainText)) {
                 console.log(`[Hybrid Logic] Using fast fetch result for: ${url.toString()}`);
                 return plainText;
             } else {
                 console.log(`[Hybrid Logic] Fast fetch content insufficient for ${url.toString()}. Falling back.`);
             }
        } else {
            console.log(`[Hybrid Logic] Fast fetch failed for ${url.toString()}. Falling back.`);
        }

        // Fallback to Heavy Fetch
        // If fast fetch failed or content was insufficient, use Puppeteer
        plainText = await this._heavyFetch(url, heavyTimeout);

        if (plainText) {
            console.log(`[Hybrid Logic] Using heavy fetch (Puppeteer) result for: ${url.toString()}`);
            return plainText;
        } else {
            console.error(`[Hybrid Logic] All methods failed for: ${url.toString()}`);
            return null; // Both methods failed
        }
    }
}
