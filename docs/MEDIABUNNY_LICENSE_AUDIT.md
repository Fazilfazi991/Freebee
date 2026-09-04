# Mediabunny commercial license and capability audit

Audit date: 2026-09-04. This engineering review is not legal advice.

## Decision

The base `mediabunny` package is acceptable for the first browser-media implementation. Version 1.55.6 is published under MPL-2.0. It is written in TypeScript, uses browser media APIs, and does not bundle the GPL FFmpeg WASM core. The package manifest lists only Web API type packages as runtime dependencies; these are declarations, not media runtimes.

MPL-2.0 is file-level weak copyleft. An unmodified library can be used and distributed with a closed-source commercial application. We must retain copyright/license headers and distribute the MPL-2.0 notice. If we modify Mediabunny-covered source files and distribute them, the source for those modified files must remain available under MPL-2.0. Our own application files that merely use the library do not become MPL-licensed.

Repository: <https://github.com/Vanilagy/mediabunny>

Documentation: <https://mediabunny.dev/>
Package: `mediabunny` 1.55.6

## Codec scope

Container support and codec support are separate. Mediabunny reads/writes MP4/MOV, WebM/Matroska, Ogg, MP3, WAV, ADTS/AAC, FLAC and other containers, but compressed codec decoding and encoding normally depend on the browser's WebCodecs implementation. Every conversion must query runtime capabilities before it is offered.

| Codec | Base-package behavior | Commercial caveat |
| --- | --- | --- |
| H.264/AVC | Native WebCodecs decode/encode where the browser exposes it | Patent/pool considerations require product/legal review; browser support is not a patent grant |
| H.265/HEVC | Native WebCodecs where exposed; highly browser/platform variable | Patent/pool review required |
| VP8 / VP9 | Native WebCodecs where exposed; suitable for WebM | Runtime detection still required |
| AV1 | Native WebCodecs where exposed; hardware support varies | Runtime detection and performance limits required |
| ProRes | Container parsing in base; optional `@mediabunny/prores` decoder extension otherwise | Extension not approved or installed |
| AAC | Native WebCodecs where exposed | Patent/licensing review may apply; optional FFmpeg-derived AAC encoder not installed |
| MP3 | Parsing/decoding where browser supports it; native encoding is uncommon | Separate patent/product review; optional encoder excluded |
| Opus / Vorbis | Native WebCodecs where exposed; WebM/Ogg candidates | Runtime detection required |
| FLAC | Native WebCodecs where exposed; optional encoder exists | Extension not approved or installed |
| PCM | Built-in base-package coders | Broadest deterministic base capability; large output files |

## Optional extensions audited but excluded

- `@mediabunny/mp3-encoder` 1.55.6 is MPL-2.0 and embeds a SIMD-enabled WASM build of LAME 3.100 (LGPL). It adds license/source/notice obligations and separate MP3 commercial considerations. It is not installed; `/mp4-to-mp3` remains planned pending explicit approval.
- `@mediabunny/aac-encoder` uses a specialized FFmpeg AAC encoder WASM build. It is not installed because its FFmpeg-derived binary and AAC commercial scope require a separate approval.
- AC-3, DTS, FLAC encoder, ProRes, and server extensions are not installed or approved in this phase.

## Browser compatibility

| Browser | Practical base expectation | Required behavior |
| --- | --- | --- |
| Chrome desktop | Broad WebCodecs support; H.264/AAC availability depends on build/platform; VP8/VP9/Opus generally practical | Query each decode/encode configuration |
| Edge desktop | Chromium capabilities, still OS/hardware dependent | Query each configuration |
| Firefox | WebCodecs availability and codec coverage vary by release/platform | Never infer support from container alone |
| Safari macOS | H.264/AAC are the likely native path; VP8/VP9/AV1 and encode support vary by OS/device | Query and offer only confirmed paths |
| Chrome Android | WebCodecs generally available but hardware and memory vary widely | Conservative transcode limits |
| Safari iOS | OS-controlled codecs and strict memory/process constraints | Prefer metadata/remux; do not claim verified transcode support |

File streaming depends on browser APIs and user-granted file handles. Ordinary uploads use `BlobSource`; outputs in this application initially use memory-backed buffers, so hard limits remain necessary even though Mediabunny supports streaming targets.

## Performance and architecture conclusion

Mediabunny is preferable to FFmpeg WASM for this phase because it is tree-shakable, has no large core download, can use browser hardware codecs, supports pipelined/lazy reads, requires no cross-origin isolation, and avoids a permanent worker/WASM heap. It should load only inside media-route code. Remux/sample-copy operations are the preferred path because they avoid decode/encode quality loss and reduce memory/CPU use. Full transcodes must remain capability-gated and conservatively limited, especially on mobile.

Sources:

- <https://github.com/Vanilagy/mediabunny>
- <https://github.com/Vanilagy/mediabunny/blob/main/package.json>
- <https://mediabunny.dev/guide/supported-formats-and-codecs>
- <https://mediabunny.dev/guide/converting-media-files>
- <https://github.com/Vanilagy/mediabunny/blob/main/packages/mp3-encoder/README.md>
