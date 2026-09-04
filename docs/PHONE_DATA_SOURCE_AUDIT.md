# Official phone data source audit

Audited 4 September 2026. Official pages are the sole source of truth.

Robots preflight found Apple specification paths not disallowed for the general user agent, Samsung's general group does not disallow the audited product paths, and Google Store explicitly allows `/product`. This is a technical robots review, not a grant of content rights; terms and operator approval remain required before scheduling.

## Apple

- Domain: `apple.com`; preferred region: AE.
- Examples: `https://www.apple.com/ae/iphone-17/specs/`, `https://www.apple.com/ae/iphone-17-pro/specs/`.
- Structure: stable semantic headings and factual lists for finish, capacity, dimensions, display, chip, camera, battery, wireless, SIM, and OS. Product and regional metadata may also appear in embedded scripts.
- Parser: `apple-parser-v2`, using section-scoped text extraction with deterministic unit and phrase rules. It extracts published storage, display, dimensions, weight, camera roles, charging claims, and SIM statements while leaving RAM and battery capacity absent.
- Limitations: battery capacity and RAM are generally not published; those values remain unknown. UAE iPhone 17 pages specify dual eSIM and no physical SIM. Marketing prose is discarded.

## Samsung

- Domain: `samsung.com`; preferred region: AE (Samsung Gulf).
- Examples: `https://www.samsung.com/ae/smartphones/galaxy-s26/specs/`, `https://www.samsung.com/ae/smartphones/galaxy-s26-ultra/`.
- Structure: variant/model tabs, rendered specification sections, JSON-LD, and substantial embedded application/product data. Some visible specs depend on selected tabs.
- Parser: `samsung-parser-v2`. An explicit model identifier is mandatory; a matching `data-model`, product id, or unique model heading scopes the fragment. Missing or duplicate identifiers fail extraction.
- Limitations: tab rendering can obscure values in static HTML, regional model codes and network support vary, and colors may be online-exclusive. Never merge another region silently.

## Google Pixel

- Domain: `store.google.com`; current audited source region: US because a stable UAE specification surface was not available.
- Examples: `https://store.google.com/product/pixel_10_specs?hl=en-US`, `https://store.google.com/product/pixel_10_pro_specs?hl=en-US`.
- Structure: sectioned rendered text and paired columns on Pro/XL pages, with product metadata in embedded scripts.
- Parser: `google-parser-v2`. Multi-model pages require an explicit model and matching model marker before field extraction. Pixel 10, Pro, and Pro XL fixtures verify variant isolation.
- Limitations: US dimensions are sometimes imperial and device/network/SIM details are region-specific. Conversion is allowed only when deterministic and provenance retains the original evidence. No US fact is labeled AE.

Automated retrieval must stop on robots denial, authentication, CAPTCHA, persistent 403/429, or other access control. No bypass is permitted.
