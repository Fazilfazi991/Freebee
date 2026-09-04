import { preflightAndFetch } from './phone-ingestion-core.mjs';
import { runDryRunPipeline } from '~/lib/phones/ingestion/pipeline';
import type { PhoneBrand } from '~/lib/phones/schema';
import { ModelScopeError } from '~/lib/phones/ingestion/scoping';
import { IngestionBlockedError } from './phone-ingestion-core.mjs';

const args = process.argv.slice(2);
const value = (key: string) => {
  const index = args.indexOf(key);
  return index >= 0 ? args[index + 1] : undefined;
};
const brand = value('--brand') as PhoneBrand | undefined;
const model = value('--model');
const dry = args.includes('--dry-run');
const catalog = {
  apple: {
    region: 'AE',
    models: {
      'iphone-17': { modelName: 'iPhone 17', url: 'https://www.apple.com/ae/iphone-17/specs/' },
      'iphone-17-pro': { modelName: 'iPhone 17 Pro', url: 'https://www.apple.com/ae/iphone-17-pro/specs/' },
      'iphone-17-pro-max': { modelName: 'iPhone 17 Pro Max', url: 'https://www.apple.com/ae/iphone-17-pro/specs/' },
    },
  },
  samsung: {
    region: 'AE',
    models: {
      'galaxy-s26': { modelName: 'Galaxy S26', url: 'https://www.samsung.com/ae/smartphones/galaxy-s26/specs/' },
      'galaxy-s26-plus': { modelName: 'Galaxy S26+', url: 'https://www.samsung.com/ae/smartphones/galaxy-s26/specs/' },
      'galaxy-s26-ultra': {
        modelName: 'Galaxy S26 Ultra',
        url: 'https://www.samsung.com/ae/smartphones/galaxy-s26/specs/',
      },
    },
  },
  google: {
    region: 'US/global',
    models: {
      'pixel-10': { modelName: 'Pixel 10', url: 'https://store.google.com/us/product/pixel_10_specs?hl=en-US' },
      'pixel-10-pro': {
        modelName: 'Pixel 10 Pro',
        url: 'https://store.google.com/us/product/pixel_10_pro_specs?hl=en-US',
      },
      'pixel-10-pro-xl': {
        modelName: 'Pixel 10 Pro XL',
        url: 'https://store.google.com/us/product/pixel_10_pro_specs?hl=en-US',
      },
    },
  },
} as const;

if (!brand || !(brand in catalog)) {
  console.error('Use --brand apple|samsung|google [--model slug] --dry-run');
  process.exit(1);
}

if (!dry) {
  console.error('Persistent ingestion requires an approved writable store; use --dry-run.');
  process.exit(2);
}

const brandCatalog = catalog[brand];
const entries = Object.entries(brandCatalog.models).filter(([slug]) => !model || slug === model);

if (!entries.length) {
  console.error(`Unknown model ${model} for ${brand}.`);
  process.exit(1);
}

for (const [slug, source] of entries) {
  try {
    const fetched = await preflightAndFetch(source.url);
    const report = runDryRunPipeline({
      brand,
      slug,
      modelName: source.modelName,
      region: brandCatalog.region,
      url: source.url,
      html: fetched.body,
      sourceHash: fetched.hash,
      httpStatus: fetched.status,
    });
    const { normalizedPhone: _, ...reviewReport } = report;
    const blocked = report.sourceHealth.some((item) => item.severity === 'critical');
    console.log(
      JSON.stringify({ mode: 'dry-run', status: blocked ? 'blocked' : 'completed', ...reviewReport }, null, 2),
    );

    if (blocked) {
      process.exitCode = 3;
    }
  } catch (error) {
    const healthCode =
      error instanceof ModelScopeError
        ? 'model-scoping-failed'
        : error instanceof IngestionBlockedError
          ? 'source-fetch-failed'
          : 'source-structure-changed';
    console.error(
      JSON.stringify(
        {
          mode: 'dry-run',
          brand,
          model: slug,
          region: brandCatalog.region,
          sourceUrl: source.url,
          status: 'blocked',
          reason: error instanceof Error ? error.message : String(error),
          sourceHealth: [{ code: healthCode, severity: 'critical' }],
          persisted: false,
        },
        null,
        2,
      ),
    );
    process.exitCode = 3;
  }
}
