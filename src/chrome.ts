import * as Puppeteer from 'puppeteer';
import * as PuppeteerPro from 'puppeteer-pro';

const _launch = PuppeteerPro.launch;
(PuppeteerPro as any).launch = async function (options?: Puppeteer.LaunchOptions & Puppeteer.ConnectOptions) {
  if (!options) options = {};

  if (options.headless === undefined) {
    options.headless = process.env.VSCODE_INSPECTOR_OPTIONS ? false : true;
  }

  options.pipe = true;

  if (!process.env.VSCODE_INSPECTOR_OPTIONS) {
    options.args = [
      '--ignore-certificate-errors',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-default-browser-check',
      '--no-first-run',
      '--disable-default-apps',
      '--disable-popup-blocking',
      '--disable-translate',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-device-discovery-notifications',
      '--disable-extensions-http-throttling',
    ];
  }

  const browser = await _launch.call(this, options) as PuppeteerPro.Browser;

  await browser.avoidDetection();
  if (!process.env.VSCODE_INSPECTOR_OPTIONS) {
    await browser.blockResources('stylesheet', 'image', 'media', 'font');
  }

  const _newPage = browser.newPage;
  (browser as any).newPage = async function () {
    const page = await _newPage.call(this, options) as Puppeteer.Page;
    await page.setViewport({ width: 1800, height: 1200 });
    return page;
  };

  const _createBrowserContext = browser.createBrowserContext;
  (browser as any).createBrowserContext = async function () {
    const context = await _createBrowserContext.call(this, options) as Puppeteer.BrowserContext;

    const _contextNewPage = context.newPage;
    (context as any).newPage = async function () {
      const page = await _contextNewPage.call(this, options) as Puppeteer.Page;
      await page.setViewport({ width: 1800, height: 1200 });
      return page;
    };

    return context;
  };

  return browser;
};

export const puppeteer = PuppeteerPro;

export function detectNewPage(browser: Puppeteer.Browser, timeout = 30 * 1000) {
  return new Promise<Puppeteer.Page>((resolve, reject) => {
    let rejectTimeout: any;

    if (timeout > 0) {
      rejectTimeout = setTimeout(() => reject(new Error(`Timeout Exceeded: ${timeout}ms exceeded`)), timeout);
    }

    browser.once('targetcreated', async target => {
      let newPage: Puppeteer.Page = null as any;

      try {
        if (target.type() === 'page') {
          const targetPage = await target.page();

          if (!targetPage) {
            return reject('Target page is null');
          }

          newPage = targetPage;

          const newPagePromise = new Promise<Puppeteer.Page>(resolve2 => newPage.once('domcontentloaded', () => resolve2(newPage)));
          const isPageLoaded = await newPage.evaluate(() => document.readyState);

          if (!isPageLoaded.match('complete|interactive')) {
            newPage = await newPagePromise;
          }

          clearTimeout(rejectTimeout);
          return resolve(newPage);
        }
      } catch (ex: any) {
        try { await newPage?.close(); } catch (_ex: any) { null; }

        clearTimeout(rejectTimeout);
        reject(ex);
      }
    });
  });
}
