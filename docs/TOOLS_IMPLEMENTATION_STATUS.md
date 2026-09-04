# Tools implementation status

| Tool | Route | Engine | Processing | Status | Dependency | License | Next enhancement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| JSON Formatter | `/json-formatter` | JSON parser | Browser | Ready | Native | — | Tree view |
| QR Generator | `/qr-generator` | Canvas QR | Browser | Ready | react-qrcode-logo | MIT | Error-correction controls |
| JPG to PDF | `/jpg-to-pdf` | PDF composition | Browser | Ready | pdf-lib 1.17.1 | MIT | Drag handles |
| Merge PDF | `/merge-pdf` | Page copy | Browser | Ready | pdf-lib 1.17.1 | MIT | Per-file page counts |
| Split PDF | `/split-pdf` | Page extraction | Browser | Ready | pdf-lib 1.17.1 + JSZip 3.10.1 | MIT | Custom output naming |
| Organize PDF | `/organize-pdf` | Page copy/rotation | Browser | Ready | pdf-lib 1.17.1 | MIT | Lazy PDF.js thumbnails |
| Compress Image | `/compress-image` | Canvas encoding | Browser | Ready | Native | — | Side-by-side preview |
| Resize Image | `/resize-image` | Canvas resize | Browser | Ready | Native | — | Named size presets |
| JPG to PNG | `/jpg-to-png` | Canvas conversion | Browser | Ready | Native | — | Batch conversion |
| PNG to JPG | `/png-to-jpg` | Canvas conversion | Browser | Ready | Native | — | Eyedropper background |
| JPG to WebP | `/jpg-to-webp` | Canvas conversion | Browser | Ready | Native | — | Batch conversion |
| WebP to JPG | `/webp-to-jpg` | Canvas conversion | Browser | Ready | Native | — | Batch conversion |
| Compress PDF | `/compress-pdf` | Not connected | — | Planned | — | — | Evaluate a real optimization engine |
| Image to Text | `/image-to-text` | Not connected | — | Planned | — | — | Evaluate local OCR |
| MP4 to MP3 | `/mp4-to-mp3` | Not connected | — | Planned | — | — | Evaluate lazy WASM codec |
