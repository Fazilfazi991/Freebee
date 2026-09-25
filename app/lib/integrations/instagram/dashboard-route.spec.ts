import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoaderFunctionArgs } from '@remix-run/cloudflare';

vi.mock('~/lib/integrations/instagram/admin-auth.server', () => ({
  getAdmin: vi.fn(async () => null),
  privateHeaders: vi.fn(() => new Headers()),
}));
vi.mock('~/lib/integrations/instagram/config.server', () => ({
  getInstagramConfig: vi.fn(() => ({})),
}));

import { loader } from '~/routes/dashboard';
import { getAdmin } from './admin-auth.server';

function args(path: string): LoaderFunctionArgs {
  return {
    request: new Request(`https://freebee.world${path}`),
    context: {},
    params: {},
  } as LoaderFunctionArgs;
}

describe('dashboard parent route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lets the public login child render without redirecting to itself', async () => {
    const result = await loader(args('/dashboard/login'));
    expect(result).toBeNull();
    expect(getAdmin).not.toHaveBeenCalled();
  });

  it('sends an unauthenticated dashboard entry to login', async () => {
    const result = await loader(args('/dashboard'));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/dashboard/login');
  });
});
