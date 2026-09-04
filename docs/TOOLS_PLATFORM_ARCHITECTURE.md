# Tools Platform architecture

## Overview

The public tools platform is an isolated Remix surface inside the existing React application. The existing AI website builder remains available at `/builder`; its chat, workbench, API, deployment, and persistence modules are unchanged.

Brand and company values live in `app/config/platform.ts`. Replace that one object when a final name, domain, social profiles, or palette is selected.

## Routes

- `/` — public platform homepage
- `/tools` — complete registry-driven directory
- `/pdf`, `/image`, `/video`, `/audio`, `/business`, `/developer`, `/ai`, `/web` — reusable category pages
- `/calculator` and `/calculator/:slug` — grouped calculator catalog and registry-backed calculator tools
- `/:slug` — registry-backed tool or category route with a real 404 for unknown entries
- `/builder` — preserved AI website builder
- `/sitemap.xml` — homepage, directory, categories, and only tools with working engines

The dynamic route means a tool becomes routable when it is added to the registry; no page file needs to be duplicated.

## Component architecture

- `PlatformLayout` owns public header, responsive navigation, footer, and global search access.
- `CategoryPage` filters and displays any category supplied from the registry.
- `ToolShell` owns breadcrumbs, identity, workspace, privacy disclosure, engine status, supporting copy, related tools, and FAQ.
- `ToolCard`, `ToolIcon`, and `GlobalToolSearch` render registry data consistently.
- `CalculatorTool` renders configuration-driven forms and results while pure formulas remain under `app/lib/tools/calculators`.
- `JsonFormatter`, `QrGenerator`, `AdvancedPdfTool`, and `OcrTool` are focused browser-side engines.
- `AdSlot` is disabled by default and renders nothing until explicitly enabled.

## Tool registry

`app/lib/tools/registry.ts` is the source of truth for names, slugs, descriptions, categories, icons, keywords, discovery flags, authentication and premium intent, accepted files, engine readiness, and FAQs. Homepage discovery, directory cards, category pages, search, related tools, route resolution, metadata, and sitemap preparation derive from it.

### Adding a tool

1. Add one `ToolDefinition` to `tools` in the registry.
2. Use a unique `id` and top-level `slug`.
3. State `engine: 'browser'` only when real processing and result handling are implemented and tested; otherwise use `planned`.
4. Add a focused workspace component when the generic file workspace is insufficient, then select it inside `ToolShell`.
5. Add the tool to the sitemap only after it provides genuine utility and useful indexed content. The current sitemap does this automatically via engine status.

## ToolShell and processing states

The shell separates platform presentation from engines. Planned file tools support idle and selected-file states and explicitly say that processing is unavailable. They never simulate success or create fake downloads. Engine adapters should later expose idle, ready, processing/progress, error, result/download, and reset states to the shell.

Heavy PDF, image, video, OCR, and AI engines should be dynamically imported from their tool workspace so they never enter global bundles. Browser processing is preferred for small, safe operations. Server or worker processing is appropriate for codecs, large jobs, secret-bearing AI calls, and operations that need durable queues.

## Browser engine architecture

Browser workspaces use shared `idle`, `files-selected`, `ready`, `processing`, `success`, and `error` phases. `BrowserFileTool` owns file selection and user-facing state; pure modules under `app/lib/tools/pdf` and `app/lib/tools/image` own transformations. The PDF layer imports `pdf-lib` dynamically inside operations, keeping it out of homepage and category entry bundles. The image layer uses `createImageBitmap`, canvas, and `toBlob` without an additional dependency.

PDF operations support ordered image-to-PDF creation, merging, range extraction, per-page splitting, reorder, rotation, removal, page numbering, and PDF-to-image export. PDF.js and its worker load lazily only when previews or rendered pages are requested. Multi-page exports use lazy-loaded JSZip, and temporary canvases, documents, and Blob URLs are released after use.

Image operations share MIME/extension mapping, aspect-ratio and percentage calculations, named resize presets, resizing, quality encoding, background flattening for JPEG, batch conversion with ZIP export, and canvas lifecycle cleanup. PNG quality controls are presented as re-encoding controls without promising size reduction.

OCR is isolated behind `OcrTool`. Tesseract.js, its worker, WebAssembly runtime, and selected language model load only after the user starts recognition. The worker is explicitly terminated after success or failure. Input images and extracted text stay in the browser.

Browser media follows a WebCodecs-first strategy through Mediabunny; the GPL FFmpeg WASM core is not used. Media code is isolated under `app/lib/tools/media` and dynamically imported only by media workspaces. Container support never implies codec support: future remux and transcode actions must query the current browser before enabling an output. `MediaInfoTool` is the first low-risk integration and disposes every input after inspection.

Calculator engines are pure, dependency-free modules. Date-only arithmetic uses UTC calendar fields and real month lengths. Loan, EMI, mortgage, car-loan, and amortization experiences reuse one reducing-balance engine; investment reuses compound growth. Calculator analytics contain only slug/category/status metadata and never entered or calculated values.

Developer and text utilities share pure transformations under `app/lib/tools/utilities` and the `UtilityTool` workspace. Unicode-safe Base64 uses `TextEncoder`/`TextDecoder`; hashes use Web Crypto; UUIDs and passwords use cryptographically secure browser randomness. JWT handling decodes only and never claims signature validity. No input text, token, hash, password, or generated value is sent to analytics.

CSV conversion is centralized under `app/lib/tools/csv` and uses Papa Parse for RFC 4180-style quoting, multiline fields, delimiter detection, and safe serialization. Invoice and quotation share `app/lib/tools/business-documents` for calculations, currency formatting, validation, deterministic filenames, and multi-page PDF generation. Business/customer data is held only in component memory.

## File limits and downloads

Limits are centralized in `app/lib/tools/limits.ts`: 20 files, 25 MB per file, 100 MB per session, and 40 megapixels per output image. These are defensive browser limits, not claims about every device's capacity. Generated files use `downloadBlob`, deterministic sanitized names, and delayed Blob URL revocation. Preview URLs and image bitmaps are released when replaced or unmounted; temporary canvases are cleared after encoding.

To implement another browser tool, add its registry record with `engine: 'planned'`, implement and test a pure engine module, connect a workspace with honest processing/error/result states, emit provider-neutral analytics without filenames or contents, then switch the registry entry to `browser`. That final switch automatically includes the route in the sitemap.

## SEO strategy

Tool and category metadata is generated from registry content. Routes support unique titles, descriptions, canonicals, Open Graph and Twitter fields, semantic headings, breadcrumbs, useful explanatory copy, and FAQ content. Add JSON-LD for WebApplication, BreadcrumbList, and FAQPage when final domain and production content are approved. Unfinished tools are deliberately excluded from the sitemap to avoid thin-page indexing.

## Future identity, access, and monetization

Free browser utilities do not depend on authentication. A future identity boundary can wrap history, favorites, storage, batch work, larger limits, and credits without changing tool definitions. The `requiresAuth` and `premium` fields express future availability, not an enforced payment system. `AdSlot` reserves a safe, non-interactive boundary below workspaces or between content sections and is off by default.

## Analytics

`app/lib/analytics.ts` defines stable event names and emits a provider-neutral browser event. A future adapter may consume `tool_view`, `tool_upload`, `tool_process_started`, `tool_process_completed`, `tool_download`, `tool_error`, `related_tool_click`, `search`, `signup_cta`, and `upgrade_cta` without coupling product components to a vendor.

## Dependency and license policy

Prefer MIT, Apache-2.0, or BSD dependencies. Record every newly introduced package in `docs/DEPENDENCY_LICENSES.md` before installation. GPL, AGPL, SSPL, BSL, non-commercial, source-available, or ambiguous packages require explicit approval. Do not copy implementation code from competing products.
