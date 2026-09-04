# Browser media engine license and technical audit

Status: **implementation blocked pending explicit commercial-license approval**  
Audit date: 2026-09-04

This is an engineering audit, not legal advice.

## Candidate packages

| Package | Audited version | Purpose | Declared license |
| --- | ---: | --- | --- |
| `@ffmpeg/ffmpeg` | 0.12.15 | Browser wrapper and worker API | MIT |
| `@ffmpeg/core` | 0.12.10 | Official single-thread FFmpeg WebAssembly core | GPL-2.0-or-later |
| `@ffmpeg/core-mt` | 0.12.10 | Official multithread FFmpeg WebAssembly core | GPL-2.0-or-later |

Repository: <https://github.com/ffmpegwasm/ffmpeg.wasm>

The wrapper's MIT license does not change the license of the core binary delivered to users. The official core package manifest expressly identifies the core as GPL-2.0-or-later.

## Core build and codecs

The project documentation identifies the maintained core as FFmpeg n5.1.4 built with Emscripten. Its documented third-party set includes x264, x265, libvpx, LAME, Ogg, Theora, Opus, Vorbis, WebP, FreeType, FriBidi, HarfBuzz, libass, zlib, and zimg.

Material implications:

- x264 is a GPL library. FFmpeg's own legal checklist specifically warns that a build containing GPL libraries such as libx264 is governed by the GPL rather than the LGPL.
- The official core package is therefore not an LGPL-only configuration.
- H.264/AVC, H.265/HEVC, MPEG-4, and MP3 may have separate patent or pool-licensing considerations depending on territory, distribution, business model, and use. Open-source copyright licenses do not grant every possible patent right.
- MP4 is a container. A stream-copy/remux operation can avoid re-encoding, but it does not remove the legal considerations attached to codecs already contained in the source.

## Commercial redistribution impact

Serving the WASM core and worker to a browser distributes copies of those binaries. Using the official GPL core in a commercial SaaS is not automatically prohibited, but it creates obligations that need legal/product approval, including provision of corresponding source and license notices. The scope of GPL obligations for the surrounding browser application must not be guessed by engineering.

FFmpeg's official guidance says that an LGPL build must omit `--enable-gpl` and `--enable-nonfree`, distribute exact corresponding source and build information, provide notices, and avoid GPL libraries. The official `@ffmpeg/core` package does not meet that proposed LGPL-only baseline because it declares GPL-2.0-or-later and includes x264.

## Technical and performance audit

- The core is loaded into the wrapper's Web Worker, not the main UI thread.
- The single-thread build starts with 32 MB and permits WebAssembly memory growth. It does not require `SharedArrayBuffer` or cross-origin isolation.
- The multithread build uses pthreads, spawns additional workers, and is configured with 1 GB initial memory and a 32-thread pool. It requires the deployment/security work associated with cross-origin isolation and is unsuitable as the first mobile configuration.
- Official benchmarks show the WASM builds are substantially slower than native FFmpeg; even the multithread build remains much slower in the published WebM-to-MP4 comparison.
- Safari and iOS are expected to have tighter practical memory/process limits than desktop Chromium. Large inputs, high-resolution transcodes, and repeated jobs would require conservative limits and device testing.
- Any approved implementation should use the single-thread core first, load it only after the user starts a media operation, terminate it on cancellation/reset, delete virtual filesystem entries in `finally`, revoke object URLs, and avoid holding duplicate input/output buffers.

## Recommended safe scope

No FFmpeg package was installed and no routes were activated by this task.

Proceed only after choosing one of these approved paths:

1. **Legal approval for the official GPL core.** Accept and implement the GPL redistribution/source/notices plan, plus a codec-patent review for commercial H.264/H.265/MP3 exposure.
2. **Commission and audit a custom LGPL-only core.** Build without `--enable-gpl` or `--enable-nonfree`, exclude x264/x265 and other GPL/nonfree components, publish exact corresponding source/configuration, and limit tools to codecs actually present. This likely means WebM/VP8/VP9/Opus/Vorbis-first output; MP4/H.264 and MP3 must not be promised until separately cleared and verified.
3. **Use a separately licensed commercial media engine.** Evaluate its browser support, codec grants, redistribution terms, bundle size, and mobile memory behavior before integration.

The requested MP4-to-MP3, MOV/WebM-to-MP4, video compression, trim, mute, GIF, and generic audio-conversion routes remain planned and sitemap-ineligible until that decision is made.

## Primary sources

- ffmpeg.wasm releases: <https://github.com/ffmpegwasm/ffmpeg.wasm/releases>
- Wrapper package manifest: <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/packages/ffmpeg/package.json>
- Core package manifest: <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/packages/core/package.json>
- Official architecture and bundled-library list: <https://ffmpegwasm.netlify.app/docs/overview/>
- Official performance comparison: <https://ffmpegwasm.netlify.app/docs/performance/>
- FFmpeg licensing and patent guidance: <https://ffmpeg.org/legal.html>
- Single-thread/multithread build memory configuration: <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/build/ffmpeg-wasm.sh>
