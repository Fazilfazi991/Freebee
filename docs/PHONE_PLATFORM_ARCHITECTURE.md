# Phone platform architecture

The phone platform is an isolated product section. Pages read `PhoneRepository`, which reads a `PhoneDataStore`; neither routes nor the repository import snapshot data directly. `JsonSnapshotPhoneStore` is the development adapter. A D1, Postgres/Supabase, or SQLite adapter can replace it without route changes.

Flow: conservative scheduled fetch → brand extractor → normalized `Phone` → validation and provenance → reviewed snapshot → directory/detail/compare/finder. Live page requests never scrape. Arbitrary comparisons are `noindex`; only future editorially approved pairs should be indexed. Product JSON-LD contains factual Product/Brand fields only—no offers, ratings, reviews, or availability.

Source policy permits public official manufacturer HTML, JSON-LD, embedded data, and documented feeds. It prohibits third-party spec databases, retailer scraping, access-control bypass, CAPTCHA circumvention, identity rotation, and copied marketing prose or imagery. UI placeholders are neutral geometry.

Change detection hashes normalized relevant source content. Unchanged content skips parsing; changed fields are reviewed before publication. Recommended schedule: new/recent every 2–3 days, current weekly, archived monthly, sequentially with conservative delay. Do not enable the schedule until source owners' robots and terms have been reviewed.

Cloudflare D1 is the recommended first production store because this Remix application already targets Cloudflare Pages/Workers. Postgres/Supabase is appropriate if editorial workflows, joins, or external administration outgrow D1; SQLite is best for local tooling. No database dependency is added yet.

Curated comparisons live in a reviewed allowlist and receive canonical, indexable routes. Arbitrary query-string comparisons remain `noindex`. Future phases may add official UAE pricing where cleanly licensed and affiliate integrations under a separate policy. AI may transform supplied official text only; it is never a factual source.
