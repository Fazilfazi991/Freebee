import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirect, type ActionFunctionArgs } from '@remix-run/cloudflare';

vi.mock('./config.server', () => ({
  getInstagramConfig: () => ({ expectedAccountId: '17841426407668459' }),
  isSameOriginPost: (request: Request) => request.headers.get('Origin') === new URL(request.url).origin,
}));
vi.mock('./admin-auth.server', () => ({
  requireAdmin: vi.fn(),
  privateHeaders: () => new Headers({ 'Cache-Control': 'private, no-store' }),
}));
vi.mock('./reel-publishing.server', () => ({
  prepareTestReel: vi.fn(), checkTestReel: vi.fn(), publishTestReel: vi.fn(),
}));
vi.mock('./reel-db.server', () => ({ getCurrentReelAttempt: vi.fn() }));
vi.mock('./supabase.server', () => ({
  IntegrationFailure: class IntegrationFailure extends Error { constructor(public code: string) { super(code); } },
  getConnection: vi.fn(),
}));

import { action } from '~/routes/dashboard.integrations.instagram';
import { requireAdmin } from './admin-auth.server';
import { publishTestReel } from './reel-publishing.server';

function args(origin = 'https://freebee.world'): ActionFunctionArgs {
  return {
    request: new Request('https://freebee.world/dashboard/integrations/instagram', {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'intent=publish&confirmation=PUBLISH+ONE+REEL',
    }),
    context: {}, params: {},
  } as ActionFunctionArgs;
}

describe('Test Reel action security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ userId: 'admin', sessionId: 'session' });
  });

  it('rejects a cross-origin publish POST before authentication', async () => {
    const response = await action(args('https://other.example'));
    expect(response.status).toBe(403);
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(publishTestReel).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated or unauthorized admins', async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(redirect('/dashboard/login'));
    await expect(action(args())).rejects.toMatchObject({ status: 302 });
    expect(publishTestReel).not.toHaveBeenCalled();
  });

  it('runs a confirmed publish only for the authenticated same-origin admin', async () => {
    const response = await action(args());
    expect(response.status).toBe(302);
    expect(publishTestReel).toHaveBeenCalledWith({ expectedAccountId: '17841426407668459' }, 'admin', 'PUBLISH ONE REEL');
    expect(response.headers.get('Location')).toBe('/dashboard/integrations/instagram');
  });
});
