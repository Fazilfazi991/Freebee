# Phone scale readiness

Assessment date: 2026-09-04. Scope: Apple, Samsung, and Google only.

## PASS

- Frozen-lockfile restore completes with Node 22 and pnpm 9.
- Full TypeScript, lint, and test suites pass; 21 test files and 162 tests completed.
- `localdev` client and SSR builds complete.
- All required phone routes and `/builder` return HTTP 200 without overlays or repository exceptions.
- Controlled Apple and Samsung fetches pass robots/access/content checks and produce SHA-256 hashes; all three brand runs preserve the no-write guarantee.
- Repository/store boundaries, publication states, parser versioning, validation, provenance, and review record models exist.
- The CLI now executes the shared production parser, model-scoping, validation, provenance, publication-review, change-detection, and source-health path.
- A non-production D1 adapter and forward migration implement parameterized public reads and auditable atomic ingestion writes; integration mocks cover success and rollback/failure recording.
- Scheduling limits are centralized and disabled by default.

## BLOCKED

- The Cloudflare production build crashes on this Windows host while Miniflare starts workerd through `getPlatformProxy`; native exception `0xc0000005`. Direct `workerd --version` succeeds and a frozen clean restore does not change the failure.
- A clean Linux Node 22 production build has not been run for this commit. Docker and WSL are unavailable on this host, and no authorized writable upstream CI target contains the local commit.
- Samsung live HTML identifies the requested S26 panels but currently yields zero normalized specification fields; source health blocks it as a structure/parser failure.
- Google Pixel 10's official US specification response exceeds the approved 2 MB source ceiling; safe fetch blocks it without parsing or persistence.

## READY AFTER APPROVAL

- Review and approve the implemented D1 schema, asynchronous adapter boundary, and eventual loader binding.
- Approve the disabled scheduling policy and operational request budget.
- Adapt Samsung extraction to its current server-visible source representation, or approve a documented official API/source alternative.
- Decide whether Google's official page may receive a narrowly justified higher response-size ceiling or requires another official source.
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
