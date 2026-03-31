import execa from 'execa';
import * as fs from 'fs';
import hash from 'object-hash';

import { puppeteer } from './chrome';

const fileLocation = 'src/index.ts';

void (async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://knowledge.hubspot.com/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature');

  const link = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLLinkElement>('article a')).find(x => x.innerText?.trim().toLowerCase() === 'download a csv file')?.href);
  if (!link) throw new Error('Could not find csv link');

  await browser.close();

  const response = await fetch(link);

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status}`);
  }

  const text = await response.text();

  const data = 'export const freeEmailDomains = ' + JSON.stringify(text.split(/[,\n\r]+/g).filter(x => x.length > 0)) + ';';

  if (data.length < 100) throw new Error('Domain count too low');

  const curHash = hash(fs.readFileSync(fileLocation).toString());
  const newHash = hash(data);

  if (curHash !== newHash) {
    fs.writeFileSync(fileLocation, data);
    await execa('cd dist && npm version --no-git-tag-version patch', { shell: true });
  }
})();
