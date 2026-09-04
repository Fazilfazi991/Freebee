# Phone ingestion

Run `pnpm phones:ingest --brand apple|samsung|google --dry-run`. Optional `--model` selects exactly one configured model. Non-dry execution is refused until a reviewed writable store exists. The CLI loads the same TypeScript brand parsers, model scoping, normalized-phone builder, validation, provenance, review gate, change detector, and source-health checks used by the production ingestion service; there is no simplified live parser.

Preflight fetches `robots.txt`, checks public accessibility, HTTP status, content type and declared/body size, and detects common CAPTCHA/access-denied responses. Product fetches use an identifiable user agent, 15-second timeout, one retry with exponential backoff, sequential execution, and a 2 MB ceiling. HTTP 403/429 stop immediately.

Dry run reports brand, model, region, URL, HTTP status, SHA-256 source hash, parser version, model-scoping evidence, extracted and explicitly unavailable fields, provenance, warnings, critical failures, source-health signals, pending changes, publication eligibility, and `persisted: false`. It never writes downloaded HTML or normalized production data.

Each brand has a separate versioned extractor under `app/lib/phones/ingestion`. Changed hashes produce field-level pending changes. Critical validation failures prevent publication; large or unexpected changes remain `awaiting-review`.

Scheduling remains disabled. The centralized policy is `app/lib/phones/ingestion/config.ts`. If approved later, it uses these tiers: newly announced/recent products every 2 days, current products weekly, and older products monthly. It caps a run at 10 product requests, processes one request at a time, and leaves at least 10 seconds between requests to the same domain. Honor `Retry-After`; otherwise apply the existing exponential backoff once, then stop the affected source on 403, 429, CAPTCHA, access denial, or repeated transport failure.

Monitor source hash, HTTP/content-type changes, parser field coverage, model-scoping evidence, validation severity, and repeated missing fields separately for each manufacturer. A changed source never publishes automatically: critical validation issues block it, ambiguous model scope fails it, and every normalized change remains pending until a reviewer approves it. A future `normalizeSpecText` provider may propose transformations from supplied evidence, but is intentionally unimplemented and cannot fill missing facts.
