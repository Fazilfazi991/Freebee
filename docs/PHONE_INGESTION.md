# Phone ingestion

Run `pnpm phones:ingest --brand apple|samsung|google --dry-run`. Optional `--model` selects exactly one configured model. Non-dry execution is refused until a reviewed writable store exists.

Preflight fetches `robots.txt`, checks public accessibility, HTTP status, content type and declared/body size, and detects common CAPTCHA/access-denied responses. Product fetches use an identifiable user agent, 15-second timeout, one retry with exponential backoff, sequential execution, and a 2 MB ceiling. HTTP 403/429 stop immediately.

Dry run reports URL, robots URL, HTTP status, SHA-256 source hash, parser version, extracted-field summary, warnings, pending changes, publication eligibility, and `persisted: false`. It never writes downloaded HTML or normalized production data.

Each brand has a separate versioned extractor under `app/lib/phones/ingestion`. Changed hashes produce field-level pending changes. Critical validation failures prevent publication; large or unexpected changes remain `awaiting-review`.

Suggested cadence: recent products every 2–3 days, current weekly, archived monthly. Fetch sequentially and stop on access restrictions or sustained errors. A future `normalizeSpecText` provider may propose transformations from supplied evidence, but is intentionally unimplemented and cannot fill missing facts.
