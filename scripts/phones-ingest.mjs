import { preflightAndFetch, summarizeChanges } from './phone-ingestion-core.mjs';
const args = process.argv.slice(2);
const value = (key) => {
  const i = args.indexOf(key);
  return i >= 0 ? args[i + 1] : undefined;
};
const brand = value('--brand');
const model = value('--model');
const dry = args.includes('--dry-run');
const catalog = {
  apple: {
    parser: 'apple-parser-v2',
    models: {
      'iphone-17': 'https://www.apple.com/ae/iphone-17/specs/',
      'iphone-17-pro': 'https://www.apple.com/ae/iphone-17-pro/specs/',
      'iphone-17-pro-max': 'https://www.apple.com/ae/iphone-17-pro/specs/',
    },
  },
  samsung: {
    parser: 'samsung-parser-v2',
    models: {
      'galaxy-s26': 'https://www.samsung.com/ae/smartphones/galaxy-s26/specs/',
      'galaxy-s26-plus': 'https://www.samsung.com/ae/smartphones/galaxy-s26/specs/',
      'galaxy-s26-ultra': 'https://www.samsung.com/ae/smartphones/galaxy-s26/specs/',
    },
  },
  google: {
    parser: 'google-parser-v2',
    models: {
      'pixel-10': 'https://store.google.com/product/pixel_10_specs?hl=en-US',
      'pixel-10-pro': 'https://store.google.com/product/pixel_10_pro_specs?hl=en-US',
      'pixel-10-pro-xl': 'https://store.google.com/product/pixel_10_pro_specs?hl=en-US',
    },
  },
};
if (!brand || !catalog[brand]) {
  console.error('Use --brand apple|samsung|google [--model slug] --dry-run');
  process.exit(1);
}
if (!dry) {
  console.error('Persistent ingestion requires an approved writable store; use --dry-run.');
  process.exit(2);
}
const entries = Object.entries(catalog[brand].models).filter(([slug]) => !model || slug === model);
if (!entries.length) {
  console.error(`Unknown model ${model} for ${brand}.`);
  process.exit(1);
}
for (const [slug, url] of entries) {
  try {
    const result = await preflightAndFetch(url);
    const text = result.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const extracted = {
      model: slug,
      displayMentions: (text.match(/display/gi) || []).length,
      storageValues: [...text.matchAll(/(\d+)\s*(GB|TB)/gi)].length,
    };
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          url,
          robotsUrl: result.robotsUrl,
          httpStatus: result.status,
          sourceHash: result.hash,
          parser: catalog[brand].parser,
          fieldsExtracted: Object.keys(extracted),
          validationWarnings: [],
          changes: summarizeChanges({}, extracted),
          publicationEligibility: 'requires parser validation and human review',
          persisted: false,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify({ mode: 'dry-run', url, status: 'blocked', reason: error.message, persisted: false }, null, 2),
    );
    process.exitCode = 3;
  }
}
