const axios = require('axios');
const pdf = require('pdf-parse');

async function test() {
  const url = 'https://prod-cms.doe.gov.ph/documents/d/guest/region-iv-b-mimaropa-8-pdf-2';
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const dataBuffer = Buffer.from(response.data);
  const data = await pdf(dataBuffer);
  console.log(data.text.substring(0, 2000));
}

test();
