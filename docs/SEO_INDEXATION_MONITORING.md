# Indexation monitoring — freebee.world

Review weekly after launch and after every material deployment. Use Google Search Console, Bing Webmaster Tools, server/deployment logs, and the repository crawler report as the sources of record.

| Metric | Source | Owner | Escalation signal |
| --- | --- | --- | --- |
| Submitted, indexed, and sitemap errors | GSC/Bing sitemap reports | SEO owner | Any sitemap fetch/parse error or unexpected indexed drop |
| Discovered, not indexed; crawled, not indexed | GSC Page Indexing | SEO + content owner | Increase on priority pages for two consecutive checks |
| Impressions, clicks, CTR, top queries, top pages | GSC Performance | SEO owner | Priority page has impressions but persistently weak CTR or no clicks |
| Bing impressions and indexed URLs | Bing Webmaster Tools | SEO owner | Material divergence from Google or crawl errors |
| HTTP failures, canonical mismatches, noindex leakage | Production crawler | Engineering | Any non-200 priority URL, duplicate canonical, or indexable route with noindex |
| Core Web Vitals | CrUX/PageSpeed Insights/Lighthouse | Engineering | Any priority template enters a failing CWV bucket |
| IndexNow submissions and responses | Deployment logs/API response | Engineering | Submission errors, duplicate unchanged batches, or non-production host |

Keep a dated record of the 84 intended indexable URLs, excluded planned tools, and any URL added or removed. Investigate changes before requesting reindexing. Never use IndexNow as a substitute for canonical, sitemap, or content quality checks.
