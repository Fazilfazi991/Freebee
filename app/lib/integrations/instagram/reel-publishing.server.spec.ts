import { beforeEach, describe, expect, it, vi } from 'vitest';

const config = { expectedAccountId: '17841426407668459', expectedUsername: 'millionvault.com_' } as never;
const connection = { id: 'connection-id', instagram_user_id: '17841426407668459', username: 'millionvault.com_', status: 'connected', token_expires_at: '2099-01-01T00:00:00Z' };
const attempt = {
  id: 'attempt-id', instagram_connection_id: 'connection-id', instagram_user_id: '17841426407668459',
  owner_user_id: 'admin', created_by: 'admin', source_host: 'video.example', source_url_sha256: 'safe-hash',
  caption: 'Test', share_to_feed: false, container_id: '17911111111111111', container_status: 'FINISHED',
  media_id: null, status: 'ready', failure_code: null, status_checks: 1, last_checked_at: null,
  published_at: null, created_at: '2026-09-25T00:00:00Z', updated_at: '2026-09-25T00:00:00Z',
};

vi.mock('./supabase.server', () => ({
  IntegrationFailure: class IntegrationFailure extends Error { constructor(public code: string) { super(code); } },
  getConnection: vi.fn(),
}));
vi.mock('./reel-db.server', () => ({
  getCurrentReelAttempt: vi.fn(), insertReelAttempt: vi.fn(), updateReelAttempt: vi.fn(),
}));
vi.mock('./reel-meta.server', () => ({
  createReelContainer: vi.fn(), getReelContainerStatus: vi.fn(), publishReelContainer: vi.fn(),
}));
vi.mock('./reel-url.server', () => ({ validatePublicMp4: vi.fn() }));

import { getConnection, IntegrationFailure } from './supabase.server';
import { getCurrentReelAttempt, insertReelAttempt, updateReelAttempt } from './reel-db.server';
import { createReelContainer, getReelContainerStatus, publishReelContainer } from './reel-meta.server';
import { validatePublicMp4 } from './reel-url.server';
import { checkTestReel, prepareTestReel, publishTestReel } from './reel-publishing.server';

describe('one-Reel publishing state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConnection).mockResolvedValue(connection as never);
    vi.mocked(getCurrentReelAttempt).mockResolvedValue(null);
    vi.mocked(validatePublicMp4).mockResolvedValue('https://video.example/reel.mp4');
    vi.mocked(insertReelAttempt).mockResolvedValue({ ...attempt, status: 'pending' } as never);
    vi.mocked(createReelContainer).mockResolvedValue('17911111111111111');
    vi.mocked(updateReelAttempt).mockImplementation(async (_config, _owner, _id, _from, patch) => ({ ...attempt, ...patch }) as never);
    vi.mocked(getReelContainerStatus).mockResolvedValue('FINISHED');
    vi.mocked(publishReelContainer).mockResolvedValue('18022222222222222');
  });

  it('blocks a disconnected or wrong account before validating the video', async () => {
    vi.mocked(getConnection).mockResolvedValueOnce(null).mockResolvedValueOnce({ ...connection, instagram_user_id: 'wrong' } as never);
    await expect(prepareTestReel(config, 'admin', 'url', 'Test')).rejects.toMatchObject({ code: 'account_disconnected' });
    await expect(prepareTestReel(config, 'admin', 'url', 'Test')).rejects.toMatchObject({ code: 'unexpected_account' });
    expect(validatePublicMp4).not.toHaveBeenCalled();
  });

  it('creates only a container and stores its ID', async () => {
    const result = await prepareTestReel(config, 'admin', 'https://video.example/reel.mp4', 'Test');
    expect(result.status).toBe('container_created');
    expect(result.container_id).toBe('17911111111111111');
    expect(publishReelContainer).not.toHaveBeenCalled();
  });

  it('does not make a second container when an attempt exists', async () => {
    vi.mocked(getCurrentReelAttempt).mockResolvedValueOnce(attempt as never);
    await expect(prepareTestReel(config, 'admin', 'url', 'Test')).rejects.toMatchObject({ code: 'already_prepared' });
    expect(createReelContainer).not.toHaveBeenCalled();
  });

  it('keeps processing state and marks FINISHED ready', async () => {
    vi.mocked(getCurrentReelAttempt).mockResolvedValue({ ...attempt, status: 'processing', container_status: 'IN_PROGRESS' } as never);
    vi.mocked(getReelContainerStatus).mockResolvedValueOnce('IN_PROGRESS').mockResolvedValueOnce('FINISHED');
    expect((await checkTestReel(config, 'admin')).status).toBe('processing');
    expect((await checkTestReel(config, 'admin')).status).toBe('ready');
  });

  it('marks processing ERROR failed and never publishes', async () => {
    vi.mocked(getCurrentReelAttempt).mockResolvedValueOnce({ ...attempt, status: 'processing' } as never);
    vi.mocked(getReelContainerStatus).mockResolvedValueOnce('ERROR');
    expect((await checkTestReel(config, 'admin')).status).toBe('failed');
    expect(publishReelContainer).not.toHaveBeenCalled();
  });

  it('rejects publish unless FINISHED and deliberately confirmed', async () => {
    vi.mocked(getCurrentReelAttempt).mockResolvedValue({ ...attempt, status: 'processing' } as never);
    await expect(publishTestReel(config, 'admin', 'PUBLISH ONE REEL')).rejects.toMatchObject({ code: 'not_ready_to_publish' });
    await expect(publishTestReel(config, 'admin', 'no')).rejects.toMatchObject({ code: 'publish_confirmation_required' });
    expect(publishReelContainer).not.toHaveBeenCalled();
  });

  it('claims ready state once and records the returned media ID', async () => {
    vi.mocked(getCurrentReelAttempt).mockResolvedValueOnce(attempt as never);
    const result = await publishTestReel(config, 'admin', 'PUBLISH ONE REEL');
    expect(result.status).toBe('published');
    expect(result.media_id).toBe('18022222222222222');
    expect(vi.mocked(updateReelAttempt).mock.calls[0][3]).toEqual(['ready']);
  });

  it('does not issue a duplicate publish after another request claims ready', async () => {
    vi.mocked(getCurrentReelAttempt).mockResolvedValueOnce(attempt as never);
    vi.mocked(updateReelAttempt).mockResolvedValueOnce(null);
    await expect(publishTestReel(config, 'admin', 'PUBLISH ONE REEL')).rejects.toMatchObject({ code: 'duplicate_publish' });
    expect(publishReelContainer).not.toHaveBeenCalled();
  });

  it('records an uncertain outcome after Meta fails and does not retry', async () => {
    vi.mocked(getCurrentReelAttempt).mockResolvedValueOnce(attempt as never);
    vi.mocked(publishReelContainer).mockRejectedValueOnce(new IntegrationFailure('publish_server_error'));
    await expect(publishTestReel(config, 'admin', 'PUBLISH ONE REEL')).rejects.toMatchObject({ code: 'publish_server_error' });
    expect(vi.mocked(updateReelAttempt).mock.calls.at(-1)?.[4]).toMatchObject({ status: 'publish_uncertain', failure_code: 'publish_server_error' });
    expect(publishReelContainer).toHaveBeenCalledTimes(1);
  });

  it('stops before Meta when the publishing database is unavailable', async () => {
    vi.mocked(getCurrentReelAttempt).mockRejectedValueOnce(new IntegrationFailure('database_unavailable'));
    await expect(prepareTestReel(config, 'admin', 'https://video.example/reel.mp4', 'Test')).rejects.toMatchObject({ code: 'database_unavailable' });
    expect(createReelContainer).not.toHaveBeenCalled();
  });
});
