const { parsePdf } = require('./backend/services/doeScraperService');

async function test() {
  const url = 'https://prod-cms.doe.gov.ph/documents/d/guest/region-iv-b-mimaropa-8-pdf-2';
  console.log('Testing parsing of:', url);
  const result = await parsePdf(url);
  console.log('Result:', result);
}

test();
