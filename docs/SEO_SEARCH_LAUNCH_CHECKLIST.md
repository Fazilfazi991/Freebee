# Search launch checklist — freebee.world

This checklist is specific to the final production host, `https://freebee.world`. It does not describe a domain migration.

## Technical release checks

- [ ] Set `VITE_PUBLIC_SITE_URL=https://freebee.world` in the production deployment environment.
- [ ] Keep the canonical host `freebee.world`; configure the hosting/DNS layer so HTTP redirects to HTTPS and `www.freebee.world` redirects directly to `https://freebee.world` when the `www` hostname resolves.
- [ ] Verify each redirect is one hop and preserves path and query string. The application canonical tags do not replace host-level redirects.
- [ ] Confirm `/robots.txt`, `/sitemap.xml`, `/indexnow-key.txt`, representative tool routes, and `/` are served from the production host.
- [ ] Keep `/blog` and `/builder` out of the index while their content/flows are not launch-ready.

## Google Search Console — freebee.world

The `sc-domain:freebee.world` property is already connected and accessible. Ownership verification is complete; do not recreate the property. Submit `https://freebee.world/sitemap.xml` after the canonical-host redirect is corrected, then inspect the homepage and priority URLs. Request indexing only for live, indexable, canonical, useful pages; do not submit planned tools or draft articles. Record sitemap status, indexed count, discovered-not-indexed count, crawl errors, impressions, clicks, CTR, and query/page exports in `GSC_BASELINE_REPORT.md`.

## Bing Webmaster Tools — freebee.world

1. Add `https://freebee.world` as the site and verify ownership using DNS or the verification method supplied by Bing.
2. Submit `https://freebee.world/sitemap.xml`.
3. Validate the same priority URLs and confirm Bingbot is allowed in `robots.txt`.
4. Configure IndexNow with the production key and verify `https://freebee.world/indexnow-key.txt` returns the key.
5. Submit only changed production URLs after deployment; never run an unchanged bulk submission.

## IndexNow activation gate

IndexNow code is present and batches unique URLs, capped at 10,000 per request. It must remain inactive until `VITE_PUBLIC_SITE_URL` is the production host and `VITE_INDEXNOW_KEY` is configured in the production secret environment. The key route must return the matching key at the root. No key or URL submissions should be made from local, preview, or temporary hosts.

## Evidence to retain

- Production crawler report with status, metadata, canonical, robots, JSON-LD, internal links, and sitemap membership.
- Redirect header captures for HTTP, HTTPS, `www`, and canonical host.
- GSC and Bing verification/sitemap screenshots or exports.
- Lighthouse/CWV runs for the homepage, calculator, calculator detail, PDF tool, and business tool.
