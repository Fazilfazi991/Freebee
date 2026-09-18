const baseUrl = (process.env.SEO_CRAWL_BASE_URL || 'http://127.0.0.1:5174').replace(/\/$/u, '');
const expectedCanonicalHost = process.env.SEO_EXPECTED_CANONICAL_HOST || 'freebee.world';

const fetchPage = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);
  return { response, html: await response.text() };
};

const match = (html, pattern) => html.match(pattern)?.[1]?.trim() || '';
const sitemap = await fetchPage('/sitemap.xml');
if (!sitemap.response.ok) throw new Error(`Sitemap returned ${sitemap.response.status}`);

const paths = [...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/gu)].map((item) => new URL(item[1]).pathname);
const uniquePaths = new Set(paths);
const rows = [];

for (const path of paths) {
  const { response, html } = await fetchPage(path);
  const canonical = match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["'](.*?)["']/iu);
  const robots = match(html, /<meta[^>]+name=["']robots["'][^>]+content=["'](.*?)["']/iu);
  rows.push({
    path,
    status: response.status,
    title: Boolean(match(html, /<title[^>]*>([\s\S]*?)<\/title>/iu)),
    description: Boolean(match(html, /<meta[^>]+name=["']description["'][^>]+content=["'](.*?)["']/iu)),
    h1: Boolean(match(html, /<h1[^>]*>([\s\S]*?)<\/h1>/iu)),
    canonical,
    canonicalHost: canonical ? new URL(canonical).host : '',
    indexable: !/noindex/iu.test(robots),
    structuredData: /application\/ld\+json/iu.test(html),
    badDomain: /example\.com|localhost/iu.test(html),
    planned: /Engine preview/iu.test(html),
  });
}

const failures = rows.filter((row) =>
  row.status !== 200 || !row.title || !row.description || !row.h1 || !row.canonical || row.canonicalHost !== expectedCanonicalHost || !row.indexable || row.badDomain || row.planned,
);
const canonicalValues = rows.map((row) => row.canonical).filter(Boolean);
const duplicateCanonicals = canonicalValues.length - new Set(canonicalValues).size;
const structuredDataExceptions = rows.filter((row) => /^\/(privacy|terms|cookies)$/u.test(row.path));
const structuredDataFailures = rows.filter((row) => !row.structuredData && !structuredDataExceptions.includes(row));

console.log(JSON.stringify({
  sitemapCount: paths.length,
  crawled: rows.length,
  statusCounts: Object.fromEntries([...new Set(rows.map((row) => row.status))].map((status) => [status, rows.filter((row) => row.status === status).length])),
  duplicateSitemapUrls: paths.length - uniquePaths.size,
  duplicateCanonicals,
  structuredDataFailures: structuredDataFailures.map((row) => row.path),
  failures: failures.map((row) => row.path),
}, null, 2));

if (failures.length || paths.length !== uniquePaths.size || duplicateCanonicals || structuredDataFailures.length) process.exitCode = 1;
