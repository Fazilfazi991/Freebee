# Public beta launch readiness

## READY

- 38 browser-local public tools; four planned tools excluded from the sitemap.
- TypeScript, lint and 94 automated tests pass.
- Canonicals, descriptions, robots, sitemap, WebSite/WebApplication structured data and internal related-tool links exist.
- Provider-neutral analytics now drops all fields except a small operational allowlist.
- Privacy, terms and cookie drafts exist without invented company details.
- Responsive safeguards cover overflow, long tokens, 16px mobile inputs, 44px touch targets and reduced motion.

## NEEDS TESTING

- Physical iOS/Android and emulated 320/360/390/430 viewport matrix.
- Chrome, Edge, Firefox and Safari release builds, including downloads and heavy-engine fixtures.
- Lighthouse on a Linux production artifact and manual screen-reader/keyboard pass.
- Long real-world invoice/quotation content and printer output.

## Performance budgets

- Homepage route JavaScript target: under 200 KB compressed, excluding shared framework code measured separately.
- Public-page CSS target: under 100 KB compressed.
- Mobile production targets: LCP under 2.5 s, CLS under 0.1, INP under 200 ms at the 75th percentile.
- Heavy processing libraries must not load on the homepage and should load only after entering or operating the relevant tool.

Static import review confirmed pdf-lib, PDF.js, Tesseract and Mediabunny are dynamically loaded. Papa Parse was changed to a dynamic import during this audit. Development-mode transfer sizes are not release measurements; Lighthouse and bundle sizes remain a Linux production-artifact gate.

## BLOCKING

- Final product name, legal entity/contact, production domain and legal approval are unset.
- A production build has not yet succeeded on a supported Linux release runner. Windows Miniflare crashes natively.
- Cross-browser and real-mobile release matrices remain incomplete.

## POST-LAUNCH

- Optional analytics/ad providers only after consent, privacy, performance and governance approval.
- Monitor generic completion/error rates without payloads; re-test browser releases and performance budgets.
- Remaining planned tools stay out of launch scope.

## Go / no-go

**No-go for unrestricted production launch.** Suitable for an internal or tightly controlled beta after a Linux artifact is built. Public beta requires the three blocking groups above to close.
