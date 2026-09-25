import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstagramConfig } from './config.server';
import type { Assignment } from './control-db.server';

vi.mock('./content-storage.server', () => ({ createSignedContentDownload: vi.fn() }));
vi.mock('./control-db.server', () => ({
  createPublicationAttempt: vi.fn(), getAssignment: vi.fn(), getContent: vi.fn(),
  getLatestPublicationAttempt: vi.fn(), getPublishingSettings: vi.fn(),
  updateAssignment: vi.fn(), updatePublicationAttempt: vi.fn(),
}));
vi.mock('./reel-meta.server', () => ({
  createReelContainerForAccount: vi.fn(), getReelContainerStatusForAccount: vi.fn(),
  publishReelContainerForAccount: vi.fn(),
}));
vi.mock('./supabase.server', () => ({
  IntegrationFailure: class IntegrationFailure extends Error { constructor(public code: string) { super(code); } },
  getInstagramAccount: vi.fn(), updateInstagramAccount: vi.fn(),
}));

import { createSignedContentDownload } from './content-storage.server';
import { createPublicationAttempt, getAssignment, getContent, getLatestPublicationAttempt,
  updateAssignment, updatePublicationAttempt } from './control-db.server';
import { createReelContainerForAccount, getReelContainerStatusForAccount,
  publishReelContainerForAccount } from './reel-meta.server';
import { prepareInstagramPublication, processInstagramPublication,
  publishInstagramPublication } from './publication-workflow.server';
import { getInstagramAccount, IntegrationFailure, updateInstagramAccount } from './supabase.server';

const config = { adminUserId: 'owner' } as InstagramConfig;
const base = { id: 'assignment', owner_user_id: 'owner', instagram_account_id: 'account',
  content_id: 'content', status: 'queued', updated_at: '2026-09-25T00:00:00.000Z',
  attempt_count: 0, status_checks: 0, share_to_feed: true, caption_snapshot: 'Prepared caption',
  cover_storage_path_snapshot: 'content/cover.jpg', instagram_container_id: null,
  last_checked_at: null, next_retry_at: null } as Assignment;

describe('multi-account publication workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getInstagramAccount).mockResolvedValue({ status: 'connected' } as Awaited<ReturnType<typeof getInstagramAccount>>);
    vi.mocked(getContent).mockResolvedValue({ status: 'ready', video_storage_path: 'content/video.mp4' } as Awaited<ReturnType<typeof getContent>>);
    vi.mocked(createPublicationAttempt).mockResolvedValue({ id: 'attempt' } as Awaited<ReturnType<typeof createPublicationAttempt>>);
    vi.mocked(getLatestPublicationAttempt).mockResolvedValue({ id: 'attempt' } as Awaited<ReturnType<typeof getLatestPublicationAttempt>>);
    vi.mocked(updatePublicationAttempt).mockResolvedValue(undefined);
    vi.mocked(createSignedContentDownload).mockImplementation(async (_, path) => `https://storage.example/${path}`);
    vi.mocked(createReelContainerForAccount).mockResolvedValue('18114865876880256');
    vi.mocked(getReelContainerStatusForAccount).mockResolvedValue('FINISHED');
    vi.mocked(publishReelContainerForAccount).mockResolvedValue('17914714917265998');
    vi.mocked(updateInstagramAccount).mockResolvedValue(null);
  });

  it('prepares the selected account with the stored caption, cover and Feed default', async () => {
    vi.mocked(getAssignment).mockResolvedValue(base);
    vi.mocked(updateAssignment)
      .mockResolvedValueOnce({ ...base, status: 'preparing', attempt_count: 1 })
      .mockResolvedValueOnce({ ...base, status: 'container_created', instagram_container_id: '18114865876880256' });
    const result = await prepareInstagramPublication(config, 'owner', 'assignment', 'manual');
    expect(result.status).toBe('container_created');
    expect(createReelContainerForAccount).toHaveBeenCalledWith(config, 'owner', 'account', {
      videoUrl: 'https://storage.example/content/video.mp4',
      coverUrl: 'https://storage.example/content/cover.jpg',
      caption: 'Prepared caption', shareToFeed: true,
    });
    expect(updatePublicationAttempt).toHaveBeenCalledWith(config, 'attempt', {
      status: 'container_created', container_id: '18114865876880256',
    });
  });

  it('does not re-publish an already published assignment', async () => {
    vi.mocked(getAssignment).mockResolvedValue({ ...base, status: 'published',
      instagram_container_id: '18114865876880256' });
    await expect(publishInstagramPublication(config, 'owner', 'assignment', 'manual'))
      .rejects.toMatchObject({ code: 'not_ready_to_publish' });
    expect(publishReelContainerForAccount).not.toHaveBeenCalled();
  });

  it('records a FINISHED container before publishing', async () => {
    vi.mocked(getAssignment).mockResolvedValue({ ...base, status: 'processing',
      instagram_container_id: '18114865876880256' });
    vi.mocked(updateAssignment)
      .mockResolvedValueOnce({ ...base, status: 'processing', status_checks: 1 })
      .mockResolvedValueOnce({ ...base, status: 'ready' });
    const result = await processInstagramPublication(config, 'owner', 'assignment');
    expect(result.status).toBe('ready');
    expect(publishReelContainerForAccount).not.toHaveBeenCalled();
  });

  it('leaves an ambiguous publication stopped for manual review', async () => {
    vi.mocked(getAssignment).mockResolvedValue({ ...base, status: 'ready',
      instagram_container_id: '18114865876880256' });
    vi.mocked(updateAssignment).mockResolvedValueOnce({ ...base, status: 'publishing' })
      .mockResolvedValueOnce({ ...base, status: 'publish_uncertain' });
    vi.mocked(publishReelContainerForAccount).mockRejectedValue(new IntegrationFailure('publish_timeout'));
    await expect(publishInstagramPublication(config, 'owner', 'assignment', 'manual'))
      .rejects.toMatchObject({ code: 'publish_timeout' });
    expect(updateAssignment).toHaveBeenCalledWith(config, 'owner', 'assignment', ['publishing'],
      expect.objectContaining({ status: 'publish_uncertain', last_error_code: 'publish_timeout' }));
    expect(publishReelContainerForAccount).toHaveBeenCalledTimes(1);
  });
});
