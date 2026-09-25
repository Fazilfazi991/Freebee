# Instagram Reel publishing smoke test

This phase uses the existing Instagram Login connection for `@millionvault.com_` (`17841426407668459`). It prepares and publishes at most one real Reel after an explicit admin action. It does not import content, schedule posts, or support multiple accounts.

## Meta API references checked September 25, 2026

- [Content Publishing](https://developers.facebook.com/documentation/instagram-platform/content-publishing): Instagram Login uses `graph.instagram.com`, an Instagram User access token, and `instagram_business_basic` plus `instagram_business_content_publish`. Create with `POST /<IG_ID>/media`, check with `GET /<IG_CONTAINER_ID>?fields=status_code`, publish with `POST /<IG_ID>/media_publish`, and inspect usage with `GET /<IG_ID>/content_publishing_limit`. The guide shows bearer authorization in its examples.
- [IG User Media](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media): use `media_type=REELS`, a public `video_url`, caption, and `share_to_feed=false` for this smoke test. The current Reel specification lists a **300 MB** maximum file size, 3 seconds to 15 minutes, H.264 or HEVC video, AAC audio, 23–60 FPS, and 9:16 as the recommended aspect ratio.
- [IG Container](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-container): `IN_PROGRESS`, `FINISHED`, `ERROR`, `EXPIRED`, and `PUBLISHED` are the documented status values. A container expires after 24 hours; the publishing guide recommends checking once a minute for no more than five minutes.
- [IG User Content Publishing Limit](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit): the endpoint explicitly lists Instagram Login support and returns `quota_usage`; its `config` may contain `quota_total` and `quota_duration`. Meta's guide and reference currently disagree about a fixed 24-hour post count, so the implementation does not hard-code one.

Some shared endpoint reference examples still show the older Facebook Login host and permissions. The Content Publishing guide's explicit Instagram Login comparison determines the host and scopes for this implementation.

## Safe test procedure

1. Supply an externally prepared public HTTPS `.mp4` URL with no query string. Keep it reachable while Meta processes it. The server checks public DNS answers, redirects, content type, and size with a HEAD request; it does not download or transcode the file. The URL itself is not stored. The database keeps only the host and a SHA-256 source reference.
2. Prepare the test Reel. This creates a Meta container, with `share_to_feed=false`, and does **not** publish.
3. Use Check Status no more than once per minute until `FINISHED`. Review the account, caption, and feed choice.
4. Only after explicit approval, type `PUBLISH ONE REEL` and submit the separate POST. The database atomically claims the ready attempt. An uncertain outcome requires manual review and is never retried automatically.
5. Record the returned Meta media ID and verify the Reel on the account. Stop after one confirmed post.

The source video still needs external codec, duration, aspect ratio, and audio validation. A HEAD response cannot prove those properties; Meta's processing result is the final eligibility check.
