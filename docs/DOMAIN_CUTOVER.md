# Domain cutover checklist

1. Select and legally clear the product name and production domain.
2. Set `VITE_PUBLIC_SITE_URL` to the final HTTPS origin and update centralized identity in `app/config/platform.ts`.
3. Verify every canonical URL.
4. Verify Open Graph and Twitter metadata URLs/assets.
5. Verify `sitemap.xml` uses the production origin.
6. Verify `robots.txt` references the production sitemap.
7. Validate WebSite and WebApplication structured data.
8. Configure DNS records.
9. Attach and verify the deployment domain.
10. Validate HTTPS, certificate renewal and HTTP-to-HTTPS behavior.
11. Establish one canonical host and permanent redirects from alternates.
12. Connect Search Console after ownership is available.
13. Connect Bing Webmaster Tools after ownership is available.
14. Add analytics or advertising only through separately approved consent and privacy work.
15. Run a final production crawl, browser matrix and link check.
