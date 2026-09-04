# Browser compatibility

Status reflects verification on 4 September 2026 and must not be treated as a promise for untested browsers.

| Browser | Status | Evidence / limitations |
| --- | --- | --- |
| Chromium in-app browser | Supported | Public routes, forms, Canvas, Web Crypto, Blob downloads, CSV conversion, pdf-lib generation and PDF.js flows exercised. |
| Chrome | Needs final device pass | APIs used are supported; automated Chrome-specific run was unavailable on this host. |
| Edge | Needs final device pass | Chromium compatibility expected, but not claimed as verified. |
| Firefox | Partially supported | Core File, Blob, Canvas and Web Crypto paths are expected to work. WebCodecs/media codec availability varies. Untested here. |
| Safari | Partially supported | Core utilities expected to work. PDF/OCR memory limits, downloads, WebCodecs and media formats require macOS/iOS testing. Untested here. |

Heavy engines are loaded only by their tools: pdf-lib for PDF edits/documents, PDF.js for rendering, Tesseract for OCR, Mediabunny for media inspection, and Papa Parse for CSV. Browser memory, codec support, download behavior and private-mode storage are implementation-dependent.
