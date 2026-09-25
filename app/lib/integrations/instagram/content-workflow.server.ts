import type { InstagramConfig } from './config.server';
import { findContentByVideoHash, getContent, insertContent, listAssignments, updateAssignment,
  updateContent, type ContentRow } from './control-db.server';
import { contentPaths, createSignedContentUpload, getStoredContentFile, getStoredContentPrefix,
  MAX_CONTENT_COVER_BYTES, MAX_CONTENT_VIDEO_BYTES } from './content-storage.server';
import { IntegrationFailure } from './supabase.server';

export function contentLabel(number: number): string { return `V${String(number).padStart(3, '0')}`; }

function captionValue(value: string): string {
  const caption = value.trim();
  if (!caption || caption.length > 2200 || [...caption].some((character) => character.charCodeAt(0) < 32 && !['\t', '\n', '\r'].includes(character))) {
    throw new IntegrationFailure('invalid_caption');
  }
  return caption;
}

function titleValue(value: string): string {
  const title = value.trim();
  if (title.length > 200 || [...title].some((character) => character.charCodeAt(0) < 32)) {
    throw new IntegrationFailure('invalid_title');
  }
  return title;
}

function hashValue(value: string): string {
  const hash = value.toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(hash)) throw new IntegrationFailure('invalid_video_hash');
  return hash;
}

export async function beginContentUpload(config: InstagramConfig, ownerId: string, input: {
  title: string; caption: string; videoHash: string; coverHash: string;
  videoSize: number; coverSize: number;
}): Promise<{ content: ContentRow; videoUploadUrl: string; coverUploadUrl: string }> {
  const caption = captionValue(input.caption);
  const title = titleValue(input.title);
  const videoHash = hashValue(input.videoHash);
  const coverHash = hashValue(input.coverHash);
  if (!Number.isSafeInteger(input.videoSize) || input.videoSize < 1 || input.videoSize > MAX_CONTENT_VIDEO_BYTES ||
      !Number.isSafeInteger(input.coverSize) || input.coverSize < 1 || input.coverSize > MAX_CONTENT_COVER_BYTES) {
    throw new IntegrationFailure('invalid_video_size');
  }
  if (await findContentByVideoHash(config, ownerId, videoHash)) throw new IntegrationFailure('duplicate_content');
  const id = crypto.randomUUID();
  const paths = contentPaths(id);
  const [videoUploadUrl, coverUploadUrl] = await Promise.all([
    createSignedContentUpload(config, paths.video), createSignedContentUpload(config, paths.cover),
  ]);
  const content = await insertContent(config, ownerId, { id, title, caption, videoHash, coverHash,
    videoPath: paths.video, coverPath: paths.cover, fileSize: input.videoSize });
  return { content, videoUploadUrl, coverUploadUrl };
}

export async function finalizeContentUpload(config: InstagramConfig, ownerId: string, contentId: string,
  metadata: { durationSeconds?: number; width?: number; height?: number; videoCodec?: string; audioCodec?: string } = {}): Promise<ContentRow> {
  const content = await getContent(config, ownerId, contentId);
  if (!content || content.status !== 'draft' || !content.video_storage_path || !content.cover_storage_path) {
    throw new IntegrationFailure('content_not_draft');
  }
  const [video, cover, videoPrefix, coverPrefix] = await Promise.all([
    getStoredContentFile(config, content.video_storage_path), getStoredContentFile(config, content.cover_storage_path),
    getStoredContentPrefix(config, content.video_storage_path), getStoredContentPrefix(config, content.cover_storage_path),
  ]);
  const mp4Magic = videoPrefix.length >= 12 && String.fromCharCode(...videoPrefix.slice(4, 8)) === 'ftyp';
  const jpegMagic = coverPrefix.length >= 3 && coverPrefix[0] === 0xff && coverPrefix[1] === 0xd8 && coverPrefix[2] === 0xff;
  if (!mp4Magic || !jpegMagic || video.mime !== 'video/mp4' || cover.mime !== 'image/jpeg' ||
      video.size > MAX_CONTENT_VIDEO_BYTES || cover.size > MAX_CONTENT_COVER_BYTES || video.size !== content.file_size_bytes) {
    await updateContent(config, ownerId, contentId, { status: 'invalid', validation_code: 'invalid_uploaded_files' });
    throw new IntegrationFailure('invalid_uploaded_files');
  }
  const duration = metadata.durationSeconds;
  const width = metadata.width;
  const height = metadata.height;
  if ((duration !== undefined && (!Number.isFinite(duration) || duration < 3 || duration > 900)) ||
      (width !== undefined && (!Number.isSafeInteger(width) || width < 1 || width > 1920)) ||
      (height !== undefined && (!Number.isSafeInteger(height) || height < 1 || height > 4096)) ||
      (metadata.videoCodec && metadata.videoCodec.length > 40) ||
      (metadata.audioCodec && metadata.audioCodec.length > 40)) {
    throw new IntegrationFailure('invalid_video_metadata');
  }
  const ready = await updateContent(config, ownerId, contentId, {
    status: 'ready', validated_at: new Date().toISOString(), validation_code: null,
    duration_seconds: duration ?? null, width: width ?? null, height: height ?? null,
    video_codec: metadata.videoCodec ?? null, audio_codec: metadata.audioCodec ?? null,
  });
  if (!ready) throw new IntegrationFailure('database_unavailable');
  return ready;
}

export async function archiveContent(config: InstagramConfig, ownerId: string, contentId: string): Promise<ContentRow> {
  const content = await getContent(config, ownerId, contentId);
  if (!content) throw new IntegrationFailure('content_not_found');
  const assignments = await listAssignments(config, ownerId, { contentId });
  if (assignments.some((assignment) => ['preparing', 'container_created', 'processing', 'ready',
    'publishing', 'publish_uncertain'].includes(assignment.status))) {
    throw new IntegrationFailure('content_in_process');
  }
  for (const assignment of assignments.filter((item) => ['queued', 'scheduled'].includes(item.status))) {
    const cancelled = await updateAssignment(config, ownerId, assignment.id, [assignment.status], {
      status: 'cancelled', last_error_code: 'content_archived',
      last_error_summary: 'Content was archived before publishing.',
    }, assignment.updated_at);
    if (!cancelled) throw new IntegrationFailure('content_in_process');
  }
  const archived = await updateContent(config, ownerId, contentId, { status: 'archived' });
  if (!archived) throw new IntegrationFailure('database_unavailable');
  return archived;
}
