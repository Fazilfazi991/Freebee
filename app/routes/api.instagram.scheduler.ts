import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getInstagramConfig } from '~/lib/integrations/instagram/config.server';
import { runInstagramSchedulerTick } from '~/lib/integrations/instagram/scheduler.server';

function schedulerSecret(context: LoaderFunctionArgs['context']): string | null {
  const environment = (context as { cloudflare?: { env?: Record<string, unknown> } }).cloudflare?.env ??
    (typeof process === 'undefined' ? {} : process.env);
  const value = environment.INSTAGRAM_SCHEDULER_SECRET;
  return typeof value === 'string' && value.length >= 32 ? value : null;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const secret = schedulerSecret(context);
  if (!secret) return json({ error: 'Scheduler not configured' }, { status: 503,
    headers: { 'Cache-Control': 'no-store' } });
  const timestamp = request.headers.get('X-Instagram-Cron-Time') ?? '';
  const signature = request.headers.get('X-Instagram-Cron-Signature') ?? '';
  if (!await verifySchedulerSignature(secret, timestamp, signature)) {
    return json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const result = await runInstagramSchedulerTick(getInstagramConfig(context));
  return json(result, { headers: { 'Cache-Control': 'no-store' } });
}

export async function verifySchedulerSignature(secret: string, timestamp: string, signature: string,
  nowSeconds = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!/^\d{10}$/u.test(timestamp) || !/^[0-9a-f]{64}$/u.test(signature) ||
      Math.abs(nowSeconds - Number(timestamp)) > 300) return false;
  const signatureBytes = new Uint8Array(signature.match(/../gu)!.map((part) => Number.parseInt(part, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, signatureBytes,
    new TextEncoder().encode(`${timestamp}.GET./api/instagram/scheduler`));
}
