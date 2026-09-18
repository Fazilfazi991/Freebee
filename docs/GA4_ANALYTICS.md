# GA4 analytics

Freebee keeps analytics provider-neutral. `app/lib/analytics.ts` continues to dispatch the existing `tool-platform:analytics` browser event, and optionally mirrors the same safe events to Google Analytics 4.

## Configuration

Set `VITE_GA_MEASUREMENT_ID` in the production environment to a valid GA4 Measurement ID such as `G-XXXXXXXXXX`. Do not commit the production ID if environment variables are managed by the deployment provider. Without a valid ID, GA4 remains disabled.

For local testing only, set `VITE_GA_ALLOW_NON_PROD=true`. Set `VITE_GA_DEBUG=true` to mark events for GA4 DebugView. These flags must not be enabled globally in production.

## Loading and consent

GA4 loads client-side only, after the application has rendered, and only when the build is production (or the explicit local opt-in is set), a valid Measurement ID exists, and analytics consent is stored as `granted` under `freebee.analytics.consent`.

The current product has no optional-cookie consent banner, so GA4 is disabled by default. The future consent UI can call `setAnalyticsConsent(true)` from `app/lib/analytics.ts`; denying consent stores `denied`. This is an implementation boundary, not a legal determination. Review the policy for launch jurisdictions before enabling optional analytics cookies.

## Page views

`AnalyticsBridge` tracks the initial page and Remix client-side route changes using `page_path` and `page_title`. GA config uses `send_page_view: false` so the application sends exactly one page view per path/title key rather than double-counting the automatic config page view.

## Event mapping

Existing provider-neutral events are forwarded with the same event names:

- `tool_upload`
- `tool_process_started`
- `tool_process_completed`
- `tool_download`
- `tool_error`
- `search`
- `tool_view`, `related_tool_click`, `signup_cta`, and `upgrade_cta` when implemented later

Allowed parameters are `tool_slug`, `category`, `status`, `processing_location`, `error_code`, `file_size_bucket`, and `search_result_count`. Internal search never sends raw query text; it sends only the result count.

Never send filenames, file contents, JWTs, passwords, invoice/customer data, calculator inputs, OCR/CSV content, Base64/JSON content, or entered email/phone values.

## Verification

For local testing, grant consent explicitly in the browser console after starting with the local flags:

```js
localStorage.setItem('freebee.analytics.consent', 'granted');
window.dispatchEvent(new CustomEvent('tool-platform:analytics-consent', { detail: { granted: true } }));
```

Use GA4 DebugView to verify the initial page view, a client-side navigation, and one generic tool event. Check that no sensitive fields are present. Production verification requires the owner to configure the Measurement ID and consent policy first.

## Search Console linking

The verified Search Console property is `sc-domain:freebee.world`. In GA4, an Editor/Admin can open **Admin → Product links → Search Console links**, select the matching GA4 web stream and `sc-domain:freebee.world`, then submit the link. No Search Console permissions are changed by this code.

## Performance

The GA script is asynchronous, client-only, and loaded only after consent. It does not participate in SSR or critical rendering. Recheck mobile LCP and the homepage PageSpeed score after any production activation.
