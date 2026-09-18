# AI search discoverability

The platform uses the same useful public pages for search engines and AI-powered search. There are no LLM-only pages, cloaked responses, or keyword permutations.

Crawler policy is explicit in `robots.txt`: Googlebot, Bingbot, and OAI-SearchBot are allowed; unknown bots are not granted a special allow rule. Query-string URLs are disallowed to reduce crawl waste. Revisit this policy with the product owner if privacy, cost, or abuse signals change.

Pages expose concise descriptions, visible formulas where relevant, labeled examples and limitations, browser-processing boundaries, breadcrumbs, and working related-tool links. This improves extractability for humans and answer systems without guaranteeing citations or rankings.

Future measurement: referral logs for AI sources, Bing AI visibility where available, indexed/crawled status, branded searches, and landing pages receiving AI referrals. Do not claim guaranteed LLM rankings.
