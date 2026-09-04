# Phone data governance

## Publication and review

Ingestion creates a versioned `IngestionRun`, source record, field provenance, and pending field changes. New records begin `draft`; structurally valid records may become `verified` or `partial`; ambiguity or critical validation produces `needs-review`. Only a human-approved `published` record reaches public repository queries, search, sitemap, or indexable comparisons. Source-hash changes never silently publish large normalized changes.

## Provenance and parsers

Every important value retains official URL, region, source section, short evidence, verification time, and parser version. Current versions are `apple-parser-v2`, `samsung-parser-v2`, and `google-parser-v2`. AI is not a source and may not fill missing values.

## Sources and regions

Only public official manufacturer pages, structured data, embedded public product data, and documented feeds are allowed. Preflight must honor robots, authentication, CAPTCHA, 403/429, content-type, size, and rate constraints. No bypass, proxy rotation, retailer scraping, or third-party specification database is permitted.

Prefer AE sources for UAE presentation. US/global fallbacks must be labeled and stored separately. SIM, storage, colors, bands, and pricing are never invisibly merged; future regional variants share a model identity but keep separate source and fact records.

## Images and prices

Keep neutral device placeholders until rights are resolved. Later options are manufacturer-approved media libraries, licensed product feeds, or approved affiliate imagery. Do not hotlink by assumption.

Future prices are regional and storage-specific with currency, source type, source URL, and verification time. Allowed sources are official MSRP, approved affiliate feeds, and retailer APIs. The schema is planning infrastructure, not permission to crawl or publish offers.

## Scheduling

Recommended tiers are every 1–3 days for new/recent phones, weekly for current phones, and monthly for older phones. Execute sequentially per domain. Any CI workflow stays manual until legal/source review and an operator contact address are approved.
