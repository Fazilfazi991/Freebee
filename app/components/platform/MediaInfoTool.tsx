import { FileUp, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatDuration, MEDIA_ACCEPT } from '~/lib/tools/media/formats';
import type { MediaInfo } from '~/lib/tools/media/metadata';

const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export function MediaInfoTool() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [preview, setPreview] = useState('');
  const [state, setState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(
    () => () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    },
    [preview],
  );

  const reset = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(null);
    setInfo(null);
    setPreview('');
    setError('');
    setState('idle');

    if (input.current) {
      input.current.value = '';
    }
  };
  const choose = async (next: File) => {
    reset();
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setState('processing');

    try {
      const { inspectMedia } = await import('~/lib/tools/media/metadata');
      setInfo(await inspectMedia(next));
      setState('success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This media file could not be inspected.');
      setState('error');
    }
  };

  return (
    <div className="tp-media-tool">
      <input
        ref={input}
        hidden
        type="file"
        accept={MEDIA_ACCEPT}
        onChange={(event) => event.target.files?.[0] && void choose(event.target.files[0])}
      />
      {!file ? (
        <button className="tp-upload" onClick={() => input.current?.click()}>
          <FileUp />
          <strong>Choose media</strong>
          <span>MP4, MOV, WebM, MP3, Ogg, WAV, FLAC or AAC</span>
        </button>
      ) : (
        <>
          <div className="tp-file-row">
            <strong>{file.name}</strong>
            <span>{size(file.size)}</span>
            <button onClick={reset}>
              <RotateCcw size={17} /> Reset
            </button>
          </div>
          {file.type.startsWith('video/') ? (
            <video className="tp-media-preview" src={preview} controls />
          ) : file.type.startsWith('audio/') ? (
            <audio src={preview} controls />
          ) : null}
        </>
      )}
      {state === 'processing' && <p aria-live="polite">Reading media details…</p>}
      {error && (
        <p className="tp-error" role="alert">
          {error}
        </p>
      )}
      {info && (
        <div className="tp-result-stats" aria-live="polite">
          <span>
            <strong>Container</strong>
            {info.container}
          </span>
          <span>
            <strong>Duration</strong>
            {formatDuration(info.duration)}
          </span>
          <span>
            <strong>MIME</strong>
            {info.mimeType}
          </span>
          <span>
            <strong>Tracks</strong>
            {info.tracks.length}
          </span>
          {info.video && (
            <>
              <span>
                <strong>Video</strong>
                {info.video.codec}
              </span>
              <span>
                <strong>Dimensions</strong>
                {info.video.width} × {info.video.height}
              </span>
              {info.video.frameRate && (
                <span>
                  <strong>Frame rate</strong>
                  {info.video.frameRate.toFixed(2)} fps
                </span>
              )}
            </>
          )}
          {info.audio && (
            <>
              <span>
                <strong>Audio</strong>
                {info.audio.codec}
              </span>
              <span>
                <strong>Sample rate</strong>
                {info.audio.sampleRate} Hz
              </span>
              <span>
                <strong>Channels</strong>
                {info.audio.channels}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
