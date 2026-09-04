# Phone ingestion

Run `pnpm phones:ingest --brand apple|samsung|google --dry-run`. Optional `--model` narrows a source URL where the configured URL contains the model token. The fetcher uses an identifiable user agent, 15-second timeout, two attempts, backoff, sequential requests, and a delay between sources.

The POC command intentionally reports response metadata and does not persist downloaded HTML or mutate published data. This makes review the required gate. Small sanitized fixtures under `test-fixtures/phones` exercise parsers without network access.

Each brand has a separate extractor under `app/lib/phones/ingestion`. Productionizing ingestion should add HTML sanitization, section/model scoping, normalized-content SHA-256 hashing, field diff output, snapshot retention policy, robots/terms preflight, and explicit approval before writing normalized records.

Suggested cadence: recent products every 2–3 days, current weekly, archived monthly. Fetch sequentially and stop on access restrictions or sustained errors. A future `normalizeSpecText` provider may propose transformations from supplied evidence, but is intentionally unimplemented and cannot fill missing facts.

