import * as Puppeteer from 'puppeteer';
import * as _puppeteer from 'puppeteer-pro';

_puppeteer.avoidDetection();
if (!process.env.VSCODE_INSPECTOR_OPTIONS) {
  _puppeteer.blockResources('stylesheet', 'image', 'media', 'font');
}
const _launch = _puppeteer.launch;
(_puppeteer as any).launch = async function (options?: Puppeteer.LaunchOptions & Puppeteer.ConnectOptions) {
  if (!options) options = {};

  if (options.headless === undefined) {
    options.headless = process.env.VSCODE_INSPECTOR_OPTIONS ? false : true;
  }

  options.pipe = true;
  options.defaultViewport = null;

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
  } else {
    options.args = [
      '--mute-audio',
    ];
  }

  const o: Puppeteer.Browser = await _launch.call(this, options);

  return o;
};

export const puppeteer = _puppeteer;

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
            console.log(`Waiting for DOM content to load on new page`);
            newPage = await newPagePromise;
          }

          const htmlLength = await newPage.evaluate(() => document.body.outerHTML.length);
          console.log(`Found page with ${htmlLength} html length`);

          clearTimeout(rejectTimeout);
          return resolve(newPage);
        }
      } catch (ex: any) {
        try { await newPage?.close(); } catch (_ex) { null; }

        clearTimeout(rejectTimeout);
        reject(ex);
      }
    });
  });
}
