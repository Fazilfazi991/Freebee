# SEO baseline audit

Audit date: 2026-09-18. Scope: Remix routes, registry, rendered metadata, crawl directives, sitemap, structured data, internal links, and indexability. No external webmaster accounts were connected.

## Current inventory

- 77 registered tools: 73 browser-working and 4 planned/unavailable. The earlier 40 count came from counting literal `engine: 'browser'` declarations and missed the two calculator map blocks, which expand to 35 calculator tools.
- 9 categories are registered; 6 have working tools and categories without a working tool are excluded from the indexable category set.
- Public route families: `/`, `/tools`, category routes, `/calculator/:slug`, single-segment tool routes, legal pages, `/builder`, `/robots.txt`, `/sitemap.xml`.
- Indexable route count after the SEO changes: home + `/tools` + 6 working categories + 73 working tools + 3 legal pages = 84. This excludes the noindex builder, noindex `/blog`, and 4 planned tools.

## Findings

### CRITICAL

- The default canonical domain was `https://example.com`; canonicals are now omitted until `VITE_PUBLIC_SITE_URL` is configured.
- Planned tools were reachable from public catalogs and could be discovered as indexable-looking pages; planned tools are now excluded from catalogs, related links, and sitemap and receive `noindex, nofollow`.
- Sitemap entries had no `<lastmod>` and included builder/planned surface; sitemap now contains only working public routes and meaningful date fields.

### HIGH

- Tool metadata was duplicated between route families and did not consistently describe browser-local processing; it now comes from `app/lib/seo.ts`.
- Related links were the first three registry entries rather than intent-relevant tools; they are now relevance-scored and bounded to five.
- Category pages were card grids with a client-side filter and exposed planned tools; they now describe the category and list working tools only.

### MEDIUM

- Robots rules previously treated every crawler identically and did not explicitly document AI crawler policy; Googlebot, Bingbot, and OAI-SearchBot are now explicit.
- JSON-LD was present only on the home/calculator paths and lacked consistent breadcrumbs; tool pages now emit WebApplication plus BreadcrumbList.
- The configured brand/domain is temporary; external verification and link acquisition remain intentionally blocked.

### LOW

- No article content exists yet; `/blog` is deferred until the first reviewed article is approved.
- There is no production access-log integration or Search Console/Bing API connection.

## Audit coverage still required in production

Run a canonical host/HTTPS redirect check, a real-device 320/360/390/430px pass, Lighthouse on representative routes, and a deployed crawl of every sitemap URL. Local source inspection cannot establish production status codes, Core Web Vitals, or CDN redirects.
