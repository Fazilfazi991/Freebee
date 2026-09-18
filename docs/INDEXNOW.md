# IndexNow readiness

The implementation is prepared but does not submit URLs automatically during builds. Set `VITE_INDEXNOW_KEY` to a generated key, deploy `indexnow-key.txt`, and configure `VITE_PUBLIC_SITE_URL` with the final HTTPS domain. The key endpoint returns 404 when unset.

The submission helper also refuses to send when `VITE_PUBLIC_SITE_URL` is absent, so local/dev builds cannot submit accidentally.

`app/lib/indexnow.ts` provides `submitIndexNow` and `indexNowBatch`. Call it from an authorized publish/update/delete workflow only, passing deduplicated absolute URLs whose meaningful content or availability changed. The helper caps a batch at 10,000 URLs. Do not submit every URL on every deployment, and do not call it from a page request.

Recommended event policy: `added` on first publication, `updated` after material content/metadata changes, and `deleted` after a confirmed removal/redirect. Keep a durable queue with retry/backoff in production; this repository intentionally has no CMS or queue yet.
