import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import {
  createSecretSession,
  getSecretSession,
  secretNames,
  secretSessionCookie,
  secretStore,
} from '~/lib/.server/secrets';

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionId = getSecretSession(request);

  if (!sessionId) {
    return Response.json({ exists: false });
  }

  const metadata = (await secretStore.listSecretMetadata(sessionId)).find(({ name }) => name === secretNames.openAI);

  return Response.json({
    exists: Boolean(metadata),
    metadata: metadata ? { updatedAt: metadata.updatedAt } : undefined,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const sessionId = getSecretSession(request) ?? createSecretSession();
  const cookie = secretSessionCookie(sessionId, new URL(request.url).protocol === 'https:');

  if (request.method === 'DELETE') {
    await secretStore.deleteSecret(sessionId, secretNames.openAI);
    return Response.json({ exists: false }, { headers: { 'Set-Cookie': cookie } });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await request.json<{ value?: unknown }>();

  if (typeof body.value !== 'string' || !body.value.trim()) {
    return Response.json({ error: 'A non-empty API key is required' }, { status: 400 });
  }

  const metadata = await secretStore.storeSecret(sessionId, secretNames.openAI, body.value);

  return Response.json(
    { exists: true, metadata: { updatedAt: metadata.updatedAt } },
    { headers: { 'Set-Cookie': cookie } },
  );
}
