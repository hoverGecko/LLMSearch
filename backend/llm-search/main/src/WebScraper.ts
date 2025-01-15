import puppeteer, { Browser } from "puppeteer-core";
import chromium from '@sparticuz/chromium';

export default class WebScraper {
    protected browser: Promise<Browser> = new Promise(async (resolve) => {
        resolve(puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath('/opt/nodejs/node_modules/@sparticuz/chromium/bin'),
            headless: chromium.headless,
        }));
    });
    /**
     * Scrap a single URL and return the HTML content.
     * @param url URL of the webpage.
     * @param timeout timeout of loading webpage in milliseconds, default is 5000ms.
     * @returns HTML string, or null if webpage loading times out or has error.
     */
    public urlToHtml = async (url: string | URL, timeout: number = 5000): Promise<string | null> => {    
        try {
            const browser = await this.browser;
            const page = await browser.newPage();
            console.log('got page')
            await page.goto(url.toString(), { waitUntil: 'networkidle2', timeout: timeout });
            const html = await page.content();
            console.log('got html')
            page.close();
            return html;
        } catch (e) {
            console.error(`Error when scraping webpage with URL <${url}>: `, e);
            return null;
        }
    }
    /**
     * Scrap webpages with array of URLs and return the HTML strings of each URL.
     * @param urls URLs of the webpages.
     * @param timeout timeout of loading each webpage in milliseconds, default is 5000ms.
     */
    public urlsToHtmls = async (urls: string[] | URL[], timeout: number = 5000): Promise<(string | null)[]> => {
        return Promise.all(urls.map(url => this.urlToHtml(url, timeout)));
    }
}
