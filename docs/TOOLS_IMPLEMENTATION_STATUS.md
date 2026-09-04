# Tools implementation and verification status

This file is the launch source of truth. Snapshot: 4 September 2026. “Browser” means local client-side processing; working routes are sitemap-eligible and show a local-processing disclosure. Browser/mobile status below is deliberately conservative.

## Complete public inventory

| Tools | Category | Engine / dependency | Status | Mobile / browser | Sitemap | Limitations |
| --- | --- | --- | --- | --- | --- | --- |
| Merge PDF, JPG to PDF, Split PDF, Rotate PDF, Remove/Extract PDF Pages, Add Page Numbers | PDF | Browser / pdf-lib 1.17.1 (MIT) | Working | Responsive / Chromium verified | Yes | 25 MB/file, 20 files, 100 MB/session |
| Organize PDF, PDF to JPG, PDF to PNG | PDF | Browser / PDF.js 5.7.284 (Apache-2.0) + pdf-lib where edited | Working | Responsive / Chromium verified | Yes | Browser memory; large documents slower |
| Compress Image, Resize Image, JPG/PNG/WebP converters | Image | Browser / Canvas + JSZip where batched | Working | Responsive / Chromium verified | Yes | 40 MP image guard; browser codec support |
| Image to Text | Image | Browser / Tesseract.js 7.0.0 (Apache-2.0) | Working | Responsive / Chromium verified | Yes | OCR accuracy and memory vary |
| Media Info | Video | Browser / Mediabunny 1.55.6 (MPL-2.0) | Working | Responsive / Chromium verified | Yes | Inspection only; format/browser dependent |
| QR Generator | Business | Browser / react-qrcode-logo 3.x (MIT) | Working | Responsive / Chromium verified | Yes | User must verify encoded content |
| Password Generator, Invoice Generator, Quotation Generator, Signature Generator | Business | Browser / Web Crypto, Canvas, pdf-lib | Working | Responsive / Chromium verified | Yes | Signature image is not identity verification; logos 2 MB/4096px |
| JSON Formatter, Base64 Encoder/Decoder, URL Encoder/Decoder, JWT Decoder, Hash Generator, Timestamp Converter, Word/Character Counter, Text Case Converter, JSON Validator, UUID Generator | Developer | Browser / native APIs | Working | Responsive / Chromium verified | Yes | JWT decode does not verify signatures; browser memory applies |
| CSV to JSON, JSON to CSV | Developer | Browser / Papa Parse 5.7.0 (MIT) | Working | Responsive / Chromium verified | Yes | Flat JSON objects only; formula-leading cells escaped on export |
| Age, Date, Date Difference, Time, BMI, Percentage, Simple/Compound Interest, Loan, EMI, Mortgage, Investment, Car Loan, Amortization, Calorie | Calculator | Browser / dependency-free pure TypeScript | Working | Responsive implementation / browser verification pending | Yes | Educational estimates; health and finance disclaimers apply |
| Discount, Profit Margin, Markup, Savings, Savings Goal, Retirement, Debt/Credit Card Payoff, Fuel Cost, Pace, Body Fat, Ideal Weight, Water Intake, Due Date, Pregnancy, Square Footage, Concrete, Paint, Fraction, Average | Calculator | Browser / dependency-free pure TypeScript | Working | Responsive implementation / browser verification pending | Yes | Financial, health/pregnancy, and construction limitations are shown with each method |
| Compress PDF, MP4 to MP3, Remove Background, AI Image Generator | Mixed | Planned | Not working | Not verified | No | Intentionally excluded from launch |

Every working row uses the visible per-tool privacy disclosure. No tool payload, filename, token, hash, password, customer field, CSV cell, or OCR result is permitted by the analytics allowlist. Exact browser claims are maintained in `BROWSER_COMPATIBILITY.md`; current centralized limits are in `app/lib/tools/limits.ts`.

Deterministic fixtures live in `test-fixtures/tools`. “Automated” records engine/unit validation; browser interaction results are recorded only after a real download and reset flow completes.

| Tool | Route | Route load | Input works | Processing works | Output valid | Download works | Reset works | Console clean | Mobile checked | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QR Generator | `/qr-generator` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified |
| JSON Formatter | `/json-formatter` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified |
| JPG to PDF | `/jpg-to-pdf` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified |
| Merge PDF | `/merge-pdf` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified |
| Split PDF | `/split-pdf` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified |
| Organize PDF | `/organize-pdf` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified; PDF.js thumbnails added |
| Compress Image | `/compress-image` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified |
| Resize Image | `/resize-image` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified; presets added |
| JPG to PNG | `/jpg-to-png` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified; batch/ZIP added |
| PNG to JPG | `/png-to-jpg` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified; batch/ZIP added |
| JPG to WebP | `/jpg-to-webp` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified; batch/ZIP added |
| WebP to JPG | `/webp-to-jpg` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Verified; batch/ZIP added |

## Newly implemented routes

The calculator batch adds `/calculator` plus 15 nested calculator routes. All share the calculator engine and workspace, are marked browser-local, and are sitemap-eligible. Formula coverage includes calendar boundaries, leap years, duration normalization, BMI, all percentage modes, simple/compound interest, contributions, standard and zero-interest amortization, mortgage optional costs, car-loan adjustments, ending balances, and Mifflin–St Jeor BMR/TDEE.

Calculator Batch 2 adds 20 more nested routes without dependencies. The category now groups 35 calculators under Finance, Health & Fitness, Date & Time, Math, and Construction. Tests cover every new pure engine, including zero/invalid denominators, zero interest, insufficient debt payments, unit conversions, pregnancy date arithmetic, construction deductions, and malformed average input.

| Tool | Route | Engine | Processing | Status |
| --- | --- | --- | --- | --- |
| PDF to JPG | `/pdf-to-jpg` | PDF.js rendering + Canvas | Browser | Verified: 3-page fixture rendered as three previews with individual and ZIP download actions |
| PDF to PNG | `/pdf-to-png` | PDF.js rendering + Canvas | Browser | Verified: 3-page fixture rendered with individual and ZIP download actions |
| Rotate PDF | `/rotate-pdf` | pdf-lib | Browser | Verified |
| Remove PDF Pages | `/remove-pdf-pages` | pdf-lib | Browser | Verified |
| Extract PDF Pages | `/extract-pdf-pages` | Shared page-range/extraction engine | Browser | Verified |
| Add Page Numbers to PDF | `/add-page-numbers-to-pdf` | pdf-lib text drawing | Browser | Verified with downloadable output |
| Image to Text | `/image-to-text` | Tesseract.js worker/WASM | Browser | Verified with local PNG OCR and text output |

Incomplete tools remain explicitly marked as planned in the registry and are not sitemap-eligible: Compress PDF, MP4 to MP3, Remove Background, AI Image Generator, and UUID Generator.

## WebCodecs media phase

| Tool | Route | Engine | Status |
| --- | --- | --- | --- |
| Media Info | `/media-info` | Lazy Mediabunny parser | Chrome desktop verified with deterministic WAV: upload, metadata, reset, and second run pass |
| MP4 to MP3 | `/mp4-to-mp3` | Optional LAME/WASM extension | Planned; separate approval required |

Mediabunny replaces the rejected FFmpeg WASM proposal. No FFmpeg core or optional Mediabunny codec extension is installed. Trim, mute, audio extraction, MOV remux, and video compression remain planned until deterministic browser fixtures verify the exact sample-copy and WebCodecs paths.

## Native utility phase

The following dependency-free routes are implemented with native browser APIs and are sitemap-eligible: `/uuid-generator`, `/base64-encoder`, `/base64-decoder`, `/url-encoder`, `/url-decoder`, `/jwt-decoder`, `/hash-generator`, `/timestamp-converter`, `/word-counter`, `/character-counter`, `/text-case-converter`, `/json-validator`, and `/password-generator`.

## Business document and CSV phase

`/csv-to-json`, `/json-to-csv`, `/invoice-generator`, `/quotation-generator`, and `/signature-generator` are implemented and sitemap-eligible. CSV uses Papa Parse 5.7.0. Invoice and quotation share pdf-lib calculations and rendering; signature output uses a local transparent canvas. Browser output verification is recorded after the current validation pass.
