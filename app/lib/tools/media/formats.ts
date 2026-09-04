export const MEDIA_ACCEPT =
  'video/mp4,video/quicktime,video/webm,audio/mp4,audio/mpeg,audio/ogg,audio/wav,audio/webm,audio/flac,audio/aac';

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return 'Unknown';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;

  return `${hours ? `${hours}:` : ''}${String(minutes).padStart(hours ? 2 : 1, '0')}:${remaining.toFixed(2).padStart(5, '0')}`;
}

export function validateTrimRange(start: number, end: number, duration: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0) {
    return 'Enter valid non-negative times.';
  }

  if (end <= start) {
    return 'End time must be after start time.';
  }

  if (end > duration) {
    return 'End time must be within the media duration.';
  }

  return null;
}

export function mediaOutputName(name: string, suffix: string, extension: string) {
  const base = name.replace(/\.[^.]+$/, '') || 'media';
  return `${base}-${suffix}.${extension.replace(/^\./, '')}`;
}
