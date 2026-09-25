import { createCookie, redirect } from '@remix-run/cloudflare';
import type { InstagramConfig } from './config.server';
import { decryptSecret, encryptSecret, randomUrlSafe } from './crypto.server';
import { getVerifiedUser, refreshSession, signIn, type AuthSession } from './supabase.server';

const adminCookie = createCookie('__Host-incomenow_admin', {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
});

type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  sessionId: string;
};

export type Admin = { userId: string; sessionId: string; setCookie?: string };

function authSessionToCookie(session: AuthSession, sessionId: string): Session {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + (session.expires_in ?? 3600) * 1000,
    sessionId,
  };
}

async function serializeSession(config: InstagramConfig, session: Session): Promise<string> {
  const encrypted = await encryptSecret(JSON.stringify(session), config.encryptionKey, 'admin-session');
  return adminCookie.serialize(encrypted);
}

async function clearSession(): Promise<string> {
  return adminCookie.serialize('', { maxAge: 0 });
}

export async function signInAdmin(config: InstagramConfig, email: string, password: string): Promise<string> {
  const authSession = await signIn(config, email, password);
  const user = await getVerifiedUser(config, authSession.access_token);
  if (user.id !== config.adminUserId || user.email?.toLowerCase() !== email.toLowerCase() || !user.email_confirmed_at) {
    throw new Error('admin_not_authorized');
  }
  return serializeSession(config, authSessionToCookie(authSession, randomUrlSafe()));
}

export async function getAdmin(request: Request, config: InstagramConfig): Promise<Admin | null> {
  const raw = await adminCookie.parse(request.headers.get('Cookie'));
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const session = JSON.parse(await decryptSecret(raw, config.encryptionKey, 'admin-session')) as Session;
    if (!session.accessToken || !session.refreshToken || !session.sessionId || !Number.isFinite(session.expiresAt)) return null;
    let setCookie: string | undefined;
    if (session.expiresAt < Date.now() + 30_000) {
      const refreshed = authSessionToCookie(await refreshSession(config, session.refreshToken), session.sessionId);
      Object.assign(session, refreshed);
      setCookie = await serializeSession(config, session);
    }
    const user = await getVerifiedUser(config, session.accessToken);
    if (user.id !== config.adminUserId || !user.email_confirmed_at) return null;
    return { userId: user.id, sessionId: session.sessionId, setCookie };
  } catch {
    return null;
  }
}

export async function requireAdmin(request: Request, config: InstagramConfig): Promise<Admin> {
  const admin = await getAdmin(request, config);
  if (!admin) throw redirect('/dashboard/login', { headers: { 'Cache-Control': 'private, no-store', 'Set-Cookie': await clearSession() } });
  return admin;
}

export function privateHeaders(admin: Admin): Headers {
  const headers = new Headers({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' });
  if (admin.setCookie) headers.append('Set-Cookie', admin.setCookie);
  return headers;
}

export async function signOutHeader(): Promise<string> {
  return clearSession();
}
