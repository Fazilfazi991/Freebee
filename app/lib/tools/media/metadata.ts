export type MediaTrackInfo = {
  type: 'video' | 'audio' | 'subtitle' | 'unknown';
  codec: string;
  details: string;
};

export type MediaInfo = {
  container: string;
  mimeType: string;
  duration: number;
  tracks: MediaTrackInfo[];
  video?: { codec: string; width: number; height: number; frameRate?: number };
  audio?: { codec: string; sampleRate: number; channels: number };
};

export async function inspectMedia(file: File): Promise<MediaInfo> {
  const { Input: mediaInput, ALL_FORMATS, BlobSource: blobSource } = await import('mediabunny');
  const input = new mediaInput({ source: new blobSource(file), formats: ALL_FORMATS });

  try {
    if (!(await input.canRead())) {
      throw new Error('This media file is not readable in this browser.');
    }

    const [format, mimeType, duration, tracks, videoTrack, audioTrack] = await Promise.all([
      input.getFormat(),
      input.getMimeType(),
      input.computeDuration(),
      input.getTracks(),
      input.getPrimaryVideoTrack(),
      input.getPrimaryAudioTrack(),
    ]);
    const details: MediaInfo = {
      container: format.name,
      mimeType,
      duration,
      tracks: await Promise.all(
        tracks.map(async (track) => ({
          type: track.type === 'video' || track.type === 'audio' || track.type === 'subtitle' ? track.type : 'unknown',
          codec: (await track.getCodec()) ?? 'Unknown',
          details: track.type,
        })),
      ),
    };

    if (videoTrack) {
      const [codec, width, height, metrics] = await Promise.all([
        videoTrack.getCodec(),
        videoTrack.getDisplayWidth(),
        videoTrack.getDisplayHeight(),
        videoTrack.computeFrameRateMetrics().catch(() => null),
      ]);
      details.video = { codec: codec ?? 'Unknown', width, height, frameRate: metrics?.averageFrameRate };
    }

    if (audioTrack) {
      const [codec, sampleRate, channels] = await Promise.all([
        audioTrack.getCodec(),
        audioTrack.getSampleRate(),
        audioTrack.getNumberOfChannels(),
      ]);
      details.audio = { codec: codec ?? 'Unknown', sampleRate, channels };
    }

    return details;
  } finally {
    input.dispose();
  }
}
