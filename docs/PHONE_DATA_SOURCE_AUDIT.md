# Official phone data source audit

Audited 4 September 2026. Official pages are the sole source of truth.

## Apple

- Domain: `apple.com`; preferred region: AE.
- Examples: `https://www.apple.com/ae/iphone-17/specs/`, `https://www.apple.com/ae/iphone-17-pro/specs/`.
- Structure: stable semantic headings and factual lists for finish, capacity, dimensions, display, chip, camera, battery, wireless, SIM, and OS. Product and regional metadata may also appear in embedded scripts.
- Parser: section-scoped text extraction with deterministic unit and phrase rules. Multi-model pages must retain model scope.
- Limitations: battery capacity and RAM are generally not published; those values remain unknown. UAE iPhone 17 pages specify dual eSIM and no physical SIM. Marketing prose is discarded.

## Samsung

- Domain: `samsung.com`; preferred region: AE (Samsung Gulf).
- Examples: `https://www.samsung.com/ae/smartphones/galaxy-s26/specs/`, `https://www.samsung.com/ae/smartphones/galaxy-s26-ultra/`.
- Structure: variant/model tabs, rendered specification sections, JSON-LD, and substantial embedded application/product data. Some visible specs depend on selected tabs.
- Parser: model-specific extractor over a sanitized, model-scoped fragment; embedded product data is secondary corroboration.
- Limitations: tab rendering can obscure values in static HTML, regional model codes and network support vary, and colors may be online-exclusive. Never merge another region silently.

## Google Pixel

- Domain: `store.google.com`; current audited source region: US because a stable UAE specification surface was not available.
- Examples: `https://store.google.com/product/pixel_10_specs?hl=en-US`, `https://store.google.com/product/pixel_10_pro_specs?hl=en-US`.
- Structure: sectioned rendered text and paired columns on Pro/XL pages, with product metadata in embedded scripts.
- Parser: heading-based sections; paired Pro/XL content must be column-scoped before normalization.
- Limitations: US dimensions are sometimes imperial and device/network/SIM details are region-specific. Conversion is allowed only when deterministic and provenance retains the original evidence. No US fact is labeled AE.

Automated retrieval must stop on robots denial, authentication, CAPTCHA, persistent 403/429, or other access control. No bypass is permitted.

