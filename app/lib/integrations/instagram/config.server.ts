import type { AppLoadContext } from '@remix-run/cloudflare';

type Environment = Record<string, unknown>;

function readEnvironment(context: AppLoadContext): Environment {
  const cloudflare = (context as AppLoadContext & { cloudflare?: { env?: Environment } }).cloudflare?.env;
  return cloudflare ?? (typeof process === 'undefined' ? {} : process.env);
}

function required(environment: Environment, name: string): string {
  const value = environment[name];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${name} configuration`);
  return value.trim();
}

export type InstagramConfig = ReturnType<typeof getInstagramConfig>;

export function getInstagramConfig(context: AppLoadContext) {
  const environment = readEnvironment(context);
  const supabaseUrl = required(environment, 'SUPABASE_URL').replace(/\/$/u, '');
  if (new URL(supabaseUrl).hostname !== 'yzxhckeyktgxpflnrtne.supabase.co') {
    throw new Error('Instagram integration is pointed at the wrong Supabase project');
  }
  const redirectUri = required(environment, 'META_INSTAGRAM_REDIRECT_URI');
  if (new URL(redirectUri).protocol !== 'https:' || new URL(redirectUri).pathname !== '/api/integrations/instagram/callback') {
    throw new Error('Invalid Instagram callback route configuration');
  }
  return {
    supabaseUrl,
    publishableKey: required(environment, 'SUPABASE_PUBLISHABLE_KEY'),
    secretKey: required(environment, 'SUPABASE_SECRET_KEY'),
    encryptionKey: required(environment, 'INSTAGRAM_ENCRYPTION_KEY_B64'),
    adminUserId: required(environment, 'INSTAGRAM_ADMIN_USER_ID'),
    instagramAppId: required(environment, 'META_INSTAGRAM_APP_ID'),
    instagramAppSecret: required(environment, 'META_INSTAGRAM_APP_SECRET'),
    redirectUri,
    expectedAccountId: required(environment, 'INSTAGRAM_EXPECTED_ACCOUNT_ID'),
    expectedUsername: required(environment, 'INSTAGRAM_EXPECTED_USERNAME').replace(/^@/u, '').toLowerCase(),
  };
}

export function isSameOriginPost(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}
