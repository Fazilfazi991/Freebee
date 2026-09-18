# Google Search Console baseline — freebee.world

## Snapshot

- Property: `sc-domain:freebee.world`
- Access: connected Search Console property, read-only inspection performed on 2026-09-18
- Report date: 2026-09-18
- Production host: `https://freebee.world`
- Expected indexable production routes: 84

## Performance

The Performance report was still showing “Processing data, please check again in a day or so” for the available 3-month view. Therefore the current GSC aggregate baseline is:

| Period | Clicks | Impressions | CTR | Average position |
| --- | ---: | ---: | ---: | ---: |
| Last 7 days | unavailable — processing | unavailable — processing | unavailable | unavailable |
| Last 28 days | unavailable — processing | unavailable — processing | unavailable | unavailable |
| Last 3 months | unavailable — processing | unavailable — processing | unavailable | unavailable |

No query or page rows were available, so there are no defensible GSC top queries, top pages, near-win queries, or underperformer rankings yet. This is an observation gap, not evidence of zero demand.

## Indexing and URL Inspection

The Page indexing report was also still processing and exposed no indexed/not-indexed counts or reason rows at the time of capture. Ten requested inspections returned the following baseline:

| URL group | Result |
| --- | --- |
| `/` | Not on Google; “Page with redirect”; Google crawled `https://www.freebee.world/`, crawl allowed, fetch successful, indexing allowed, user-declared canonical none |
| `/calculator`, `/calculator/age-calculator`, `/calculator/bmi-calculator`, `/calculator/loan-calculator`, `/calculator/mortgage-calculator`, `/calculator/compound-interest-calculator`, `/merge-pdf`, `/jpg-to-pdf`, `/invoice-generator` | Not on Google; URL unknown to Google; no referring sitemap, no crawl yet |

The live host check found `https://freebee.world/` redirects to `https://www.freebee.world/` in one hop. The application emits `https://freebee.world` canonicals, so the hosting primary-domain redirect and the application canonical are inconsistent. Set the production primary/canonical host to `freebee.world`, then re-check the homepage and priority URLs. No indexing requests were submitted during this audit.

## Sitemap

- Live URL: `https://freebee.world/sitemap.xml`
- HTTP status: 200
- Local/live crawler discovered: 84 URLs
- Unique URLs: 84
- GSC submission status: no submitted sitemap row yet (`0-0 of 0`)
- Last read/discovered pages/errors: unavailable until the sitemap is submitted or discovered by Google

Submitting the sitemap is an owner action after the host redirect is corrected. It is not a code or ownership-verification blocker.

## Queries, pages, and opportunities

There are no actual GSC query/page impressions available yet. Until the report processes, the working priority remains the existing-page set documented in `SEO_PRIORITY_PAGE_PLAN.md`, not speculative new routes. When data appears, classify queries as calculators, PDF, image, developer, business, brand, and unexpected; promote queries with meaningful impressions and positions 4–20 into the page optimization queue.

## Core Web Vitals and HTTPS

- GSC Core Web Vitals: no mobile or desktop usage data in the last 90 days.
- PageSpeed Insights live homepage, mobile Lighthouse 13.4.1: performance 67, accessibility 92, best practices 100, SEO 100; FCP 3.6s, LCP 6.5s, TBT 0ms, CLS 0, Speed Index 4.8s.
- PageSpeed Insights live homepage, desktop Lighthouse 13.4.1: performance 98, accessibility 96, best practices 100, SEO 100; FCP 0.7s, LCP 1.0s, TBT 0ms, CLS 0.002, Speed Index 0.9s.
- PageSpeed reported “No Data” for field data, so these are lab measurements and not real-user CWV.
- HTTPS is reachable. Host redirect consistency remains the outstanding HTTPS/canonical check.

## Next evidence refresh

After the canonical host is corrected and `https://freebee.world/sitemap.xml` is submitted, refresh this report for 7-day, 28-day, and 3-month Performance data, Page indexing counts/reasons, sitemap last-read/discovered URLs, and the same ten URL inspections. Keep account names, cookies, tokens, and session details out of the repository.
