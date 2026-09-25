import type { InstagramConfig } from './config.server';
import { database, restUrl, IntegrationFailure } from './supabase.server';

export type OrderingMode = 'sequential' | 'random' | 'smart_random';
export type ContentStatus = 'draft' | 'ready' | 'invalid' | 'archived';
export type AssignmentStatus = 'queued' | 'scheduled' | 'preparing' | 'container_created' |
  'processing' | 'ready' | 'publishing' | 'published' | 'failed' | 'skipped' | 'cancelled' | 'publish_uncertain';

export type PublishingSettings = {
  singleton: true; auto_publish: boolean; pause_all: boolean; updated_at: string;
};

export type ContentRow = {
  id: string; owner_user_id: string; content_number: number; title: string; caption: string;
  video_storage_path: string | null; cover_storage_path: string | null;
  video_sha256: string | null; cover_sha256: string | null; file_size_bytes: number | null;
  duration_seconds: number | null; width: number | null; height: number | null;
  video_codec: string | null; audio_codec: string | null;
  status: ContentStatus; validation_code: string | null; validated_at: string | null;
  created_at: string; updated_at: string;
};

export type PostingSlot = {
  id: string; instagram_account_id: string; owner_user_id: string;
  time_of_day: string; enabled: boolean; created_at: string; updated_at: string;
};

export type Assignment = {
  id: string; instagram_account_id: string; content_id: string; owner_user_id: string;
  posting_slot_id: string | null; slot_local_date: string | null; status: AssignmentStatus;
  order_position: number | null; scheduled_at: string | null; started_at: string | null;
  published_at: string | null; caption_snapshot: string; share_to_feed: boolean;
  cover_storage_path_snapshot: string | null; instagram_container_id: string | null;
  instagram_media_id: string | null; attempt_count: number; status_checks: number;
  last_checked_at: string | null; last_error_code: string | null;
  last_error_summary: string | null; next_retry_at: string | null;
  created_at: string; updated_at: string;
};

export type PublicationAttempt = {
  id: string; assignment_id: string; attempt_number: number; container_id: string | null;
  media_id: string | null; status: string; safe_error_code: string | null;
  started_at: string; finished_at: string | null;
};

function collection(config: InstagramConfig, table: string, ownerId?: string): URL {
  const url = restUrl(config, table);
  if (ownerId) url.searchParams.set('owner_user_id', `eq.${ownerId}`);
  return url;
}

function assertUuid(id: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)) {
    throw new IntegrationFailure('invalid_id');
  }
}

export async function getPublishingSettings(config: InstagramConfig): Promise<PublishingSettings> {
  const url = collection(config, 'instagram_publishing_settings');
  url.searchParams.set('select', 'singleton,auto_publish,pause_all,updated_at');
  url.searchParams.set('singleton', 'eq.true');
  const row = (await database<PublishingSettings[]>(config, url, { method: 'GET' }))[0];
  if (!row) throw new IntegrationFailure('database_unavailable');
  return row;
}

export async function updatePublishingSettings(config: InstagramConfig, adminId: string,
  patch: { auto_publish?: boolean; pause_all?: boolean }): Promise<PublishingSettings> {
  const url = collection(config, 'instagram_publishing_settings');
  url.searchParams.set('singleton', 'eq.true');
  url.searchParams.set('select', 'singleton,auto_publish,pause_all,updated_at');
  const row = (await database<PublishingSettings[]>(config, url, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...patch, updated_by: adminId, updated_at: new Date().toISOString() }),
  }))[0];
  if (!row) throw new IntegrationFailure('database_unavailable');
  return row;
}

export async function listContent(config: InstagramConfig, ownerId: string): Promise<ContentRow[]> {
  const result: ContentRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const url = collection(config, 'instagram_content', ownerId);
    url.searchParams.set('select', '*');
    url.searchParams.set('order', 'content_number.desc');
    url.searchParams.set('limit', '500');
    url.searchParams.set('offset', String(offset));
    const page = await database<ContentRow[]>(config, url, { method: 'GET' });
    result.push(...page);
    if (page.length < 500) return result;
  }
}

export async function getContent(config: InstagramConfig, ownerId: string, id: string): Promise<ContentRow | null> {
  assertUuid(id);
  const url = collection(config, 'instagram_content', ownerId);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('select', '*');
  url.searchParams.set('limit', '1');
  return (await database<ContentRow[]>(config, url, { method: 'GET' }))[0] ?? null;
}

export async function findContentByVideoHash(config: InstagramConfig, ownerId: string, hash: string): Promise<ContentRow | null> {
  if (!/^[0-9a-f]{64}$/u.test(hash)) throw new IntegrationFailure('invalid_video_hash');
  const url = collection(config, 'instagram_content', ownerId);
  url.searchParams.set('video_sha256', `eq.${hash}`);
  url.searchParams.set('status', 'neq.archived');
  url.searchParams.set('select', '*');
  url.searchParams.set('limit', '1');
  return (await database<ContentRow[]>(config, url, { method: 'GET' }))[0] ?? null;
}

export async function insertContent(config: InstagramConfig, ownerId: string, data: {
  id: string; title: string; caption: string; videoHash: string; coverHash: string;
  videoPath: string; coverPath: string; fileSize: number;
}): Promise<ContentRow> {
  assertUuid(data.id);
  const url = collection(config, 'instagram_content');
  url.searchParams.set('select', '*');
  let rows: ContentRow[];
  try {
    rows = await database<ContentRow[]>(config, url, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ id: data.id, owner_user_id: ownerId, title: data.title,
        caption: data.caption, video_sha256: data.videoHash, cover_sha256: data.coverHash,
        video_storage_path: data.videoPath, cover_storage_path: data.coverPath,
        file_size_bytes: data.fileSize, status: 'draft' }),
    });
  } catch { throw new IntegrationFailure('content_save_failed'); }
  if (rows.length !== 1) throw new IntegrationFailure('content_save_failed');
  return rows[0];
}

export async function updateContent(config: InstagramConfig, ownerId: string, id: string,
  patch: Partial<Pick<ContentRow, 'title' | 'caption' | 'status' | 'validation_code' | 'validated_at' |
    'duration_seconds' | 'width' | 'height' | 'video_codec' | 'audio_codec'>>): Promise<ContentRow | null> {
  assertUuid(id);
  const url = collection(config, 'instagram_content', ownerId);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('select', '*');
  return (await database<ContentRow[]>(config, url, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  }))[0] ?? null;
}

export async function listPostingSlots(config: InstagramConfig, ownerId: string, accountId?: string): Promise<PostingSlot[]> {
  const url = collection(config, 'instagram_posting_slots', ownerId);
  if (accountId) { assertUuid(accountId); url.searchParams.set('instagram_account_id', `eq.${accountId}`); }
  url.searchParams.set('select', '*');
  url.searchParams.set('order', 'time_of_day.asc');
  return database<PostingSlot[]>(config, url, { method: 'GET' });
}

export async function savePostingSlot(config: InstagramConfig, ownerId: string, accountId: string,
  timeOfDay: string, enabled = true): Promise<PostingSlot> {
  assertUuid(accountId);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(timeOfDay)) throw new IntegrationFailure('invalid_posting_time');
  const url = collection(config, 'instagram_posting_slots');
  url.searchParams.set('on_conflict', 'instagram_account_id,time_of_day');
  url.searchParams.set('select', '*');
  const rows = await database<PostingSlot[]>(config, url, {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ instagram_account_id: accountId, owner_user_id: ownerId,
      time_of_day: `${timeOfDay}:00`, enabled, updated_at: new Date().toISOString() }),
  });
  if (rows.length !== 1) throw new IntegrationFailure('database_unavailable');
  return rows[0];
}

export async function setPostingSlotEnabled(config: InstagramConfig, ownerId: string,
  accountId: string, slotId: string, enabled: boolean): Promise<void> {
  assertUuid(accountId); assertUuid(slotId);
  const url = collection(config, 'instagram_posting_slots', ownerId);
  url.searchParams.set('instagram_account_id', `eq.${accountId}`);
  url.searchParams.set('id', `eq.${slotId}`);
  await database(config, url, { method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ enabled, updated_at: new Date().toISOString() }) });
}

export async function listAssignments(config: InstagramConfig, ownerId: string,
  filter: { accountId?: string; contentId?: string; status?: AssignmentStatus } = {}): Promise<Assignment[]> {
  const result: Assignment[] = [];
  for (let offset = 0; ; offset += 500) {
    const url = collection(config, 'instagram_account_content', ownerId);
    if (filter.accountId) { assertUuid(filter.accountId); url.searchParams.set('instagram_account_id', `eq.${filter.accountId}`); }
    if (filter.contentId) { assertUuid(filter.contentId); url.searchParams.set('content_id', `eq.${filter.contentId}`); }
    if (filter.status) url.searchParams.set('status', `eq.${filter.status}`);
    url.searchParams.set('select', '*');
    url.searchParams.set('order', 'created_at.desc,id.desc');
    url.searchParams.set('limit', '500');
    url.searchParams.set('offset', String(offset));
    const page = await database<Assignment[]>(config, url, { method: 'GET' });
    result.push(...page);
    if (page.length < 500) return result;
  }
}

export async function getAssignment(config: InstagramConfig, ownerId: string, id: string): Promise<Assignment | null> {
  assertUuid(id);
  const url = collection(config, 'instagram_account_content', ownerId);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('select', '*');
  url.searchParams.set('limit', '1');
  return (await database<Assignment[]>(config, url, { method: 'GET' }))[0] ?? null;
}

export async function createAssignment(config: InstagramConfig, ownerId: string, row: {
  accountId: string; contentId: string; caption: string; shareToFeed: boolean; coverPath: string | null;
  slotId?: string; localDate?: string; scheduledAt?: string; orderPosition?: number;
}): Promise<Assignment> {
  assertUuid(row.accountId); assertUuid(row.contentId);
  if (row.slotId) assertUuid(row.slotId);
  const url = collection(config, 'instagram_account_content');
  url.searchParams.set('select', '*');
  let rows: Assignment[];
  try {
    rows = await database<Assignment[]>(config, url, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ instagram_account_id: row.accountId, content_id: row.contentId,
        owner_user_id: ownerId, caption_snapshot: row.caption, share_to_feed: row.shareToFeed,
        cover_storage_path_snapshot: row.coverPath, posting_slot_id: row.slotId ?? null,
        slot_local_date: row.localDate ?? null, scheduled_at: row.scheduledAt ?? null,
        status: row.scheduledAt ? 'scheduled' : 'queued', order_position: row.orderPosition ?? null }),
    });
  } catch (error) {
    // A unique constraint can reject either the account/content pair or an occupied slot.
    // Do not disguise a database outage as a harmless duplicate.
    const existing = await listAssignments(config, ownerId, { accountId: row.accountId }).catch(() => []);
    if (existing.some((item) => item.content_id === row.contentId ||
      (row.slotId && row.localDate && item.posting_slot_id === row.slotId && item.slot_local_date === row.localDate))) {
      throw new IntegrationFailure('duplicate_assignment');
    }
    throw error;
  }
  if (rows.length !== 1) throw new IntegrationFailure('database_unavailable');
  return rows[0];
}

export async function updateAssignment(config: InstagramConfig, ownerId: string, id: string,
  from: AssignmentStatus[], patch: Partial<Assignment>, expectedUpdatedAt?: string): Promise<Assignment | null> {
  assertUuid(id);
  const url = collection(config, 'instagram_account_content', ownerId);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('status', `in.(${from.join(',')})`);
  if (expectedUpdatedAt) url.searchParams.set('updated_at', `eq.${expectedUpdatedAt}`);
  url.searchParams.set('select', '*');
  return (await database<Assignment[]>(config, url, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  }))[0] ?? null;
}

export async function createPublicationAttempt(config: InstagramConfig, assignmentId: string, attemptNumber: number): Promise<PublicationAttempt> {
  assertUuid(assignmentId);
  const url = collection(config, 'instagram_publication_attempts');
  url.searchParams.set('select', '*');
  const rows = await database<PublicationAttempt[]>(config, url, {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ assignment_id: assignmentId, attempt_number: attemptNumber, status: 'preparing' }),
  });
  if (rows.length !== 1) throw new IntegrationFailure('database_unavailable');
  return rows[0];
}

export async function updatePublicationAttempt(config: InstagramConfig, id: string,
  patch: Partial<PublicationAttempt>): Promise<void> {
  assertUuid(id);
  const url = collection(config, 'instagram_publication_attempts');
  url.searchParams.set('id', `eq.${id}`);
  await database(config, url, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
}

export async function getLatestPublicationAttempt(config: InstagramConfig, assignmentId: string): Promise<PublicationAttempt | null> {
  assertUuid(assignmentId);
  const url = collection(config, 'instagram_publication_attempts');
  url.searchParams.set('assignment_id', `eq.${assignmentId}`);
  url.searchParams.set('select', '*');
  url.searchParams.set('order', 'attempt_number.desc');
  url.searchParams.set('limit', '1');
  return (await database<PublicationAttempt[]>(config, url, { method: 'GET' }))[0] ?? null;
}

export async function listWorkAssignments(config: InstagramConfig, ownerId: string, now: Date, limit = 5): Promise<Assignment[]> {
  const url = collection(config, 'instagram_account_content', ownerId);
  url.searchParams.set('select', '*');
  url.searchParams.set('status', 'in.(scheduled,container_created,processing,ready)');
  url.searchParams.set('scheduled_at', `lte.${now.toISOString()}`);
  url.searchParams.set('or', `(next_retry_at.is.null,next_retry_at.lte.${now.toISOString()})`);
  url.searchParams.set('order', 'scheduled_at.asc');
  url.searchParams.set('limit', String(Math.min(25, Math.max(1, limit))));
  return database<Assignment[]>(config, url, { method: 'GET' });
}
