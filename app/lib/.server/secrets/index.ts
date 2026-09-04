import { parseCookies } from '~/lib/api/cookies';
import { MemorySecretStore } from './memory-secret-store';

const SESSION_COOKIE = 'bolt_secret_session';
const OPENAI_SECRET = 'provider:OpenAI';
const globalSecrets = globalThis as typeof globalThis & { __boltDevelopmentSecretStore?: MemorySecretStore };

export const secretStore = globalSecrets.__boltDevelopmentSecretStore ?? new MemorySecretStore();
globalSecrets.__boltDevelopmentSecretStore = secretStore;

export function getSecretSession(request: Request) {
  return parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
}

export function createSecretSession() {
  return crypto.randomUUID();
}

export function secretSessionCookie(sessionId: string, secure: boolean) {
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax; Max-Age=28800`;
}

export async function getServerManagedApiKeys(request: Request): Promise<Record<string, string>> {
  const sessionId = getSecretSession(request);

  if (!sessionId) {
    return {};
  }

  const openAI = await secretStore.getSecret(sessionId, OPENAI_SECRET);
  const keys: Record<string, string> = {};

  if (openAI) {
    keys.OpenAI = openAI;
  }

  return keys;
}

export const secretNames = { openAI: OPENAI_SECRET } as const;
