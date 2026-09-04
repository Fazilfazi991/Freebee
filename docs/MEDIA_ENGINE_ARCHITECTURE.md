# WebCodecs browser media architecture

The media engine uses Mediabunny and native WebCodecs capabilities. It does not use ffmpeg.wasm, a GPL FFmpeg core, cloud processing, or server transcoding.

## Loading and ownership

Media modules live under `app/lib/tools/media`. React workspaces dynamically import operation modules after the user supplies media, keeping Mediabunny out of homepage, PDF, image, OCR, and builder entry bundles. Each operation owns an `Input` instance and disposes it in `finally`. Preview URLs are revoked on reset and unmount.

## Capability model

Container parsing, decoding, encoding, and muxing are separate capabilities. An MP4 or WebM writer does not prove that the browser can encode the requested codec. Every future transcode must use Mediabunny/WebCodecs capability queries for the specific audio/video configuration before enabling its action.

The preferred order is:

1. Packet/sample copy into a compatible target container.
2. Native hardware-assisted WebCodecs transcode when explicitly supported.
3. Explain that the source/browser combination is unsupported.

Optional WASM codec extensions are not an automatic fallback and require their own license approval.

## Initial limits

Metadata inspection accepts files up to the platform upload safeguard and reads lazily. Future in-memory remux jobs should start with a 500 MB desktop warning/1 GB hard ceiling and a 200 MB mobile warning. Full transcodes should start with 250 MB, 1080p, and ten minutes on desktop; mobile guidance should be 100 MB, 720p, and five minutes until device measurements justify expansion.

## Adding a media tool

Add pure capability/format logic and tests under `app/lib/tools/media`, keep Mediabunny commands out of React, dynamically import the operation from its workspace, expose only runtime-confirmed options, clean up in `finally`, verify a second run, and activate the registry/sitemap entry only after browser playback and download validation.
