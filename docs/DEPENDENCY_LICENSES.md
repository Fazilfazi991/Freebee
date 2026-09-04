# Dependency license record

The tools platform uses only commercially permissive dependencies.

Existing packages used by this surface:

| Dependency | Repository | License | Reason |
| --- | --- | --- | --- |
| `lucide-react` | https://github.com/lucide-icons/lucide | ISC | Existing consistent icon set for platform navigation and tool metadata. |
| `react-qrcode-logo` | https://github.com/gcoro/react-qrcode-logo | MIT | Existing dependency used to provide the working browser-side QR generator. |
| `pdf-lib` 1.17.1 | https://github.com/Hopding/pdf-lib | MIT | Browser-side PDF creation, merging, splitting, page reordering, deletion, and rotation. Its four runtime dependencies use permissive MIT/Zlib-style licenses and require no copyleft distribution terms. |
| `jszip` 3.10.1 | https://github.com/Stuk/jszip | MIT or GPL-3.0-or-later (dual-licensed; used under MIT) | Existing dependency, lazy-loaded to bundle multi-file split-PDF results into one download. |
| `pdfjs-dist` 5.7.284 | https://github.com/mozilla/pdf.js | Apache-2.0 | Lazy browser-side PDF rendering for thumbnails and image export; its worker is loaded only by PDF rendering tools. |
| `tesseract.js` 7.0.0 | https://github.com/naptha/tesseract.js | Apache-2.0 | Lazy browser/WASM OCR with an English model and explicit worker termination. |

Any future dependency must be recorded here before it is added. Permissive MIT, Apache-2.0, and BSD licenses are preferred for this commercial product.
