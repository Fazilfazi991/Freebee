# Phone platform architecture

The phone proof of concept is an isolated product section. Pages read `PhoneRepository`, not manufacturer sites or snapshot files directly. The current `SnapshotPhoneRepository` can later be replaced by a database adapter without changing routes.

Flow: conservative scheduled fetch → brand extractor → normalized `Phone` → validation and provenance → reviewed snapshot → directory/detail/compare/finder. Live page requests never scrape. Arbitrary comparisons are `noindex`; only future editorially approved pairs should be indexed. Product JSON-LD contains factual Product/Brand fields only—no offers, ratings, reviews, or availability.

Source policy permits public official manufacturer HTML, JSON-LD, embedded data, and documented feeds. It prohibits third-party spec databases, retailer scraping, access-control bypass, CAPTCHA circumvention, identity rotation, and copied marketing prose or imagery. UI placeholders are neutral geometry.

Change detection hashes normalized relevant source content. Unchanged content skips parsing; changed fields are reviewed before publication. Recommended schedule: new/recent every 2–3 days, current weekly, archived monthly, sequentially with conservative delay. Do not enable the schedule until source owners' robots and terms have been reviewed.

Future phases may add a reviewed database adapter, curated comparison pages, official UAE pricing where cleanly licensed, and affiliate integrations under a separate policy. AI may transform supplied official text only; it is never a factual source.

