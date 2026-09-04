# Phone scale readiness

Assessment date: 2026-09-04. Scope: Apple, Samsung, and Google only.

## PASS

- Frozen-lockfile restore completes with Node 22 and pnpm 9.
- Full TypeScript, lint, and test suites pass; 19 test files and 158 tests completed.
- `localdev` client and SSR builds complete.
- All required phone routes and `/builder` return HTTP 200 without overlays or repository exceptions.
- Controlled Apple, Samsung, and Google fetches pass robots/access/content checks, produce SHA-256 hashes, and persist nothing.
- Repository/store boundaries, publication states, parser versioning, validation, provenance, and review record models exist.

## BLOCKED

- The Cloudflare production build crashes on this Windows host while Miniflare starts workerd through `getPlatformProxy`; native exception `0xc0000005`. Direct `workerd --version` succeeds and a frozen clean restore does not change the failure.
- A clean Linux Node 22 production build has not been run for this commit. Docker and WSL are unavailable on this host, and no authorized writable upstream CI target contains the local commit.
- Live ingestion dry-runs currently execute preflight, fetch, hashing, change-summary scaffolding, and the no-write gate, but do not yet pass fetched HTML through the deterministic brand parser and validation pipeline.

## READY AFTER APPROVAL

- Implement and review the proposed D1 schema and `D1PhoneDataStore` binding.
- Approve the disabled scheduling policy and operational request budget.
- Connect the CLI dry-run to the same parser, scoping, validation, and stored-record comparison path used for reviewed ingestion.
- Run the frozen install, full checks, production build, and route smoke suite on Linux Node 22 CI.

## PHASE 3

New brands may enter discovery only after every blocked item is closed. Xiaomi, OnePlus, and Honor are not approved for ingestion or publication yet. Each future brand requires an official-source audit, deterministic parser, fixtures, validation coverage, region policy, provenance, and an explicit publication review.

## Scale gate

All of the following are mandatory before adding brands:

- Full repository tests pass.
- Linux production build passes.
- Required route smoke checks pass against the supported release runtime.
- End-to-end dry-run ingestion passes for all three current manufacturers.
- Writable-store plan is approved.
- Scheduling policy is approved.
