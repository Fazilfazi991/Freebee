import { IntegrationFailure } from './supabase.server';

const MAX_VIDEO_BYTES = 300 * 1024 * 1024;
const PRIVATE_IPV4 = /^(?:0\.|10\.|127\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|192\.0\.0\.|198\.(?:1[89])\.|2(?:2[4-9]|[3-5]\d)\.)/u;

function publicVideoUrl(input: string): URL {
  let url: URL;
  try { url = new URL(input); } catch { throw new IntegrationFailure('invalid_video_url'); }
  const host = url.hostname.toLowerCase().replace(/\.$/u, '');
  if (
    url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash ||
    input.length > 2048 || !/\.mp4$/iu.test(url.pathname) || !host.includes('.') ||
    host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
    host.endsWith('.internal') || host.endsWith('.test') || host.endsWith('.invalid') ||
    (host === 'vercel.com' || host.endsWith('.vercel.com')) ||
    (host === 'supabase.com' || host.endsWith('.supabase.com')) ||
    (host.endsWith('.supabase.co') && !url.pathname.startsWith('/storage/v1/object/public/')) ||
    host.startsWith('[') || /^\d+(?:\.\d+){3}$/u.test(host) || PRIVATE_IPV4.test(host)
  ) throw new IntegrationFailure('invalid_video_url');
  return url;
}

type DnsAnswer = { type?: number; data?: string };

function isPublicAddress(value: string | undefined): boolean {
  if (!value) return false;
  if (value.includes(':')) {
    // Globally routable IPv6 unicast is 2000::/3. Reject local and mapped addresses.
    const first = Number.parseInt(value.split(':')[0], 16);
    return Number.isFinite(first) && first >= 0x2000 && first <= 0x3fff;
  }
  return /^\d+(?:\.\d+){3}$/u.test(value) && !PRIVATE_IPV4.test(value);
}

async function assertPublicDns(host: string): Promise<void> {
  const answers: DnsAnswer[] = [];
  for (const type of ['A', 'AAAA']) {
    const lookup = new URL('https://cloudflare-dns.com/dns-query');
    lookup.searchParams.set('name', host);
    lookup.searchParams.set('type', type);
    let response: Response;
    try {
      response = await fetch(lookup, { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(5000), cache: 'no-store' });
      if (!response.ok) throw new Error('dns');
      const body = await response.json() as { Status?: number; Answer?: DnsAnswer[] };
      if (body.Status !== 0 && body.Status !== 3) throw new Error('dns');
      answers.push(...(body.Answer ?? []).filter((answer) => answer.type === 1 || answer.type === 28));
    } catch { throw new IntegrationFailure('video_dns_unavailable'); }
  }
  if (!answers.length) throw new IntegrationFailure('video_dns_unavailable');
  if (answers.some(({ data }) => !isPublicAddress(data))) {
    throw new IntegrationFailure('invalid_video_url');
  }
}

export async function validatePublicMp4(input: string): Promise<string> {
  let current = publicVideoUrl(input.trim());
  for (let redirects = 0; redirects <= 3; redirects++) {
    await assertPublicDns(current.hostname);
    let response: Response;
    try {
      response = await fetch(current, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(10000), cache: 'no-store' });
    } catch { throw new IntegrationFailure('video_unavailable'); }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (!location || redirects === 3) throw new IntegrationFailure('video_unavailable');
      current = publicVideoUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new IntegrationFailure('video_unavailable');
    const mime = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    if (mime && !['video/mp4', 'application/mp4', 'application/octet-stream'].includes(mime)) {
      throw new IntegrationFailure('invalid_video_type');
    }
    const sizeHeader = response.headers.get('Content-Length');
    if (sizeHeader) {
      const size = Number(sizeHeader);
      if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_VIDEO_BYTES) throw new IntegrationFailure('invalid_video_size');
    }
    return current.toString();
  }
  throw new IntegrationFailure('video_unavailable');
}
