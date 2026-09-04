const args = process.argv.slice(2);
const value = (key) => {
  const i = args.indexOf(key);
  return i >= 0 ? args[i + 1] : undefined;
};
const brand = value('--brand');
const model = value('--model');
const dry = args.includes('--dry-run');
const sources = {
  apple: ['https://www.apple.com/ae/iphone-17/specs/', 'https://www.apple.com/ae/iphone-17-pro/specs/'],
  samsung: ['https://www.samsung.com/ae/smartphones/galaxy-s26/specs/'],
  google: [
    'https://store.google.com/product/pixel_10_specs?hl=en-US',
    'https://store.google.com/product/pixel_10_pro_specs?hl=en-US',
  ],
};
if (!brand || !sources[brand]) {
  console.error('Use --brand apple|samsung|google [--model slug] [--dry-run]');
  process.exit(1);
}
const urls = model ? sources[brand].filter((url) => url.includes(model)) : sources[brand];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (const url of urls) {
  let response;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': 'ToolsPlatformPhoneAudit/0.1 (+contact: operator; official-source POC)' },
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) break;
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt === 1) throw error;
      await wait(1200);
    }
  }
  const body = await response.text();
  console.log(
    JSON.stringify(
      {
        brand,
        url,
        status: response.status,
        bytes: body.length,
        mode: dry ? 'dry-run' : 'review-required',
        note: 'This POC never writes fetched HTML or production data automatically.',
      },
      null,
      2,
    ),
  );
  await wait(1500);
}
