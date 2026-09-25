import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstagramConfig } from './config.server';
import type { Assignment, ContentRow, PostingSlot } from './control-db.server';
import type { ConnectionRow } from './supabase.server';

vi.mock('./control-db.server', () => ({
  createAssignment: vi.fn(), getPublishingSettings: vi.fn(), listAssignments: vi.fn(),
  listContent: vi.fn(), listPostingSlots: vi.fn(), getContent: vi.fn(),
}));
vi.mock('./supabase.server', () => ({
  IntegrationFailure: class IntegrationFailure extends Error { constructor(public code: string) { super(code); } },
  getInstagramAccount: vi.fn(), listInstagramAccounts: vi.fn(),
}));

import { createAssignment, getPublishingSettings, listAssignments, listContent,
  listPostingSlots } from './control-db.server';
import { planPostingSlots } from './distribution.server';
import { listInstagramAccounts } from './supabase.server';

const config = {} as InstagramConfig;
const now = new Date('2026-09-26T00:00:00.000Z');
const accounts = ['account-a', 'account-b'].map((id) => ({ id, status: 'connected',
  posting_enabled: true, timezone: 'Asia/Dubai', posts_per_day: 1,
  ordering_mode: 'sequential', default_share_to_feed: true })) as ConnectionRow[];
const slots = accounts.map((account) => ({ id: `slot-${account.id}`,
  instagram_account_id: account.id, enabled: true, time_of_day: '09:00:00' })) as PostingSlot[];
const content = [1, 2].map((number) => ({ id: `content-${number}`, content_number: number,
  status: 'ready', caption: `Caption ${number}`, cover_storage_path: null })) as ContentRow[];

describe('posting planner bounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPublishingSettings).mockResolvedValue({ singleton: true, auto_publish: false,
      pause_all: false, updated_at: now.toISOString() });
    vi.mocked(listInstagramAccounts).mockResolvedValue(accounts);
    vi.mocked(listPostingSlots).mockResolvedValue(slots);
    vi.mocked(listAssignments).mockResolvedValue([]);
    vi.mocked(listContent).mockResolvedValue(content);
    vi.mocked(createAssignment).mockImplementation(async (_config, _ownerId, input) => ({
      id: `assignment-${input.accountId}-${input.contentId}`, instagram_account_id: input.accountId,
      content_id: input.contentId, posting_slot_id: input.slotId,
      slot_local_date: input.localDate, status: 'scheduled',
    }) as Assignment);
  });

  it('prefetches shared data once and stops at the requested batch size', async () => {
    const planned = await planPostingSlots(config, 'admin', now, 36, 1);
    expect(planned).toHaveLength(1);
    expect(vi.mocked(createAssignment)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createAssignment).mock.calls[0]?.[2]).toMatchObject({
      accountId: 'account-a', contentId: 'content-1', shareToFeed: true,
    });
    expect(listContent).toHaveBeenCalledTimes(1);
    expect(listAssignments).toHaveBeenCalledTimes(1);
  });

  it('never plans while globally paused', async () => {
    vi.mocked(getPublishingSettings).mockResolvedValue({ singleton: true, auto_publish: false,
      pause_all: true, updated_at: now.toISOString() });
    expect(await planPostingSlots(config, 'admin', now)).toEqual([]);
    expect(createAssignment).not.toHaveBeenCalled();
  });
});
