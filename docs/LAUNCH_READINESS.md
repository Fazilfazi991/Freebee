# Release candidate launch readiness

## PASS

- 38 browser-local public tools; four planned tools excluded from the sitemap.
- TypeScript, lint and 96 automated tests pass.
- Development-mode audit totals: 56 public/direct routes crawled without HTTP failures and 51 sitemap URLs.
- Canonicals, descriptions, robots, sitemap, WebSite/WebApplication structured data and internal related-tool links exist.
- Provider-neutral analytics now drops all fields except a small operational allowlist.
- Privacy, terms and cookie drafts exist without invented company details.
- Responsive safeguards cover overflow, long tokens, 16px mobile inputs, 44px touch targets and reduced motion.

## CONDITIONAL PASS

- Physical iOS/Android testing; the emulated 320/360/390/430 representative matrix passed in Chrome development mode.
- Chrome, Edge, Firefox and Safari release builds, including downloads and heavy-engine fixtures.
- Lighthouse on a Linux production artifact and manual screen-reader/keyboard pass.
- Long real-world invoice/quotation content and printer output.
- Chrome development-mode keyboard pass reached skip link, navigation, search, breadcrumbs and invoice fields in logical order with visible focus and no trap. A screen-reader pass is still required.
- Automated PDF validation covers normal and 45-line multipage documents. Physical A4 print preview, long-address and logo print sign-off remain outstanding.

## Performance budgets

- Homepage route JavaScript target: under 200 KB compressed, excluding shared framework code measured separately.
- Public-page CSS target: under 100 KB compressed.
- Mobile production targets: LCP under 2.5 s, CLS under 0.1, INP under 200 ms at the 75th percentile.
- Heavy processing libraries must not load on the homepage and should load only after entering or operating the relevant tool.

Static import review confirmed pdf-lib, PDF.js, Tesseract and Mediabunny are dynamically loaded. Papa Parse was changed to a dynamic import during this audit. Development-mode transfer sizes are not release measurements; Lighthouse and bundle sizes remain a Linux production-artifact gate.

## BLOCKED

- Final product name, legal entity/contact, production domain and legal approval are unset.
- A production build has not yet succeeded on a supported Linux release runner. Windows Miniflare crashes natively.
- Cross-browser and real-mobile release matrices remain incomplete.
- Legacy `VITE_*_ACCESS_TOKEN` builder variables must remain unset in production because Vite-prefixed values are public.
- Production dependency audit reports 85 advisories (1 critical, 38 high, 30 moderate, 16 low). Critical/high paths include fast-xml-parser through AWS Bedrock, Remix/React Router XSS advisories, the MCP SDK, Rollup, jsondiffpatch and inherited desktop/build dependencies. Remediation requires a separately verified dependency stabilization pass; major upgrades were intentionally not applied blindly.
- `package.json` retains the inherited `1.0.0` version. No beta identifier was invented; release versioning must be chosen with the final release process.

## POST-LAUNCH

- Optional analytics/ad providers only after consent, privacy, performance and governance approval.
- Monitor generic completion/error rates without payloads; re-test browser releases and performance budgets.
- Remaining planned tools stay out of launch scope.

## Go / no-go

**BLOCKED.** A controlled public beta is not approved until a Linux artifact builds and runs, critical browser/device checks pass or are explicitly accepted, and the final brand/domain/legal approvals are complete.
