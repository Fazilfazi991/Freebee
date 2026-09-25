import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstagramConfig } from './config.server';

vi.mock('./control-db.server', () => ({
  getPublishingSettings: vi.fn(), listWorkAssignments: vi.fn(),
}));
vi.mock('./distribution.server', () => ({ planPostingSlots: vi.fn() }));
vi.mock('./publication-workflow.server', () => ({
  prepareInstagramPublication: vi.fn(), processInstagramPublication: vi.fn(),
  publishInstagramPublication: vi.fn(),
}));
vi.mock('./supabase.server', () => ({
  IntegrationFailure: class IntegrationFailure extends Error { constructor(public code: string) { super(code); } },
  getInstagramAccount: vi.fn(), updateInstagramAccount: vi.fn(),
}));

import { getPublishingSettings, listWorkAssignments } from './control-db.server';
import { planPostingSlots } from './distribution.server';
import { prepareInstagramPublication, publishInstagramPublication } from './publication-workflow.server';
import { runInstagramSchedulerTick } from './scheduler.server';

const config = { adminUserId: 'admin' } as InstagramConfig;
const now = new Date('2026-09-25T19:00:00.000Z');

describe('Instagram scheduler safety gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(planPostingSlots).mockResolvedValue([]);
    vi.mocked(listWorkAssignments).mockResolvedValue([]);
  });

  it('does no planning or publishing while globally paused', async () => {
    vi.mocked(getPublishingSettings).mockResolvedValue({ singleton: true, auto_publish: true,
      pause_all: true, updated_at: now.toISOString() });
    const result = await runInstagramSchedulerTick(config, now);
    expect(result.paused).toBe(true);
    expect(planPostingSlots).not.toHaveBeenCalled();
    expect(listWorkAssignments).not.toHaveBeenCalled();
    expect(publishInstagramPublication).not.toHaveBeenCalled();
  });

  it('plans safely but never calls Meta while auto publish is off', async () => {
    vi.mocked(getPublishingSettings).mockResolvedValue({ singleton: true, auto_publish: false,
      pause_all: false, updated_at: now.toISOString() });
    await runInstagramSchedulerTick(config, now);
    expect(planPostingSlots).toHaveBeenCalledWith(config, 'admin', now, 36, 5);
    expect(listWorkAssignments).not.toHaveBeenCalled();
    expect(prepareInstagramPublication).not.toHaveBeenCalled();
    expect(publishInstagramPublication).not.toHaveBeenCalled();
  });

  it('limits a tick to one work item per account', async () => {
    vi.mocked(getPublishingSettings).mockResolvedValue({ singleton: true, auto_publish: true,
      pause_all: false, updated_at: now.toISOString() });
    vi.mocked(listWorkAssignments).mockResolvedValue([
      { id: 'one', instagram_account_id: 'account', status: 'scheduled' },
      { id: 'two', instagram_account_id: 'account', status: 'ready' },
    ] as Awaited<ReturnType<typeof listWorkAssignments>>);
    const result = await runInstagramSchedulerTick(config, now);
    expect(prepareInstagramPublication).toHaveBeenCalledTimes(1);
    expect(publishInstagramPublication).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });
});
