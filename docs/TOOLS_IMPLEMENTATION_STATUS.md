# Tools implementation and verification status

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

CSV conversion and invoice, quotation, and signature generation remain planned for the next batch; they were not represented as working without their required shared parser/document UX and browser verification.
