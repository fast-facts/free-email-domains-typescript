import axios from 'axios';
import * as fs from 'fs';
import * as hash from 'object-hash';

// tslint:disable-next-line: no-var-requires
const cmd = require('node-run-cmd');

const fileLocation = 'src/index.ts';

// https://knowledge.hubspot.com/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature
axios.get('https://f.hubspotusercontent40.net/hubfs/2832391/Marketing/Lead-Capture/free-domains-1.csv')
  .then(response => {
    const data = 'export const freeEmailDomains = ' + JSON.stringify(response.data.split(/,\n/g));

    if (data.length < 100) {
      throw new Error('Domain count too low');
    }

    const curHash = hash(fs.readFileSync(fileLocation).toString());
    const newHash = hash(data);

    if (curHash !== newHash) {
      fs.writeFileSync(fileLocation, data);
      cmd.run('cd dist && npm version --no-git-tag-version patch', { shell: true });
    }
  })
  .catch(ex => {
    throw ex; // Throw for github action to fail
  });