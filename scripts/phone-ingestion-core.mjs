import { createHash } from 'node:crypto';
export class IngestionBlockedError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'IngestionBlockedError';
    this.status = status;
  }
}
export const normalizeSource = (value) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export const sourceHash = (value) => createHash('sha256').update(normalizeSource(value)).digest('hex');
export function robotsAllows(robotsText, url, userAgent = 'ToolsPlatformPhoneIngestor') {
  const path = new URL(url).pathname;
  let applies = false;
  for (const raw of robotsText.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim();
    if (!line) continue;
    const [key, ...parts] = line.split(':');
    const value = parts.join(':').trim();
    if (key.toLowerCase() === 'user-agent') {
      applies = value === '*' || value.toLowerCase() === userAgent.toLowerCase();
      continue;
    }
    if (applies && key.toLowerCase() === 'disallow' && value && path.startsWith(value.replace('*', ''))) return false;
  }
  return true;
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function preflightAndFetch(
  url,
  {
    fetchImpl = fetch,
    userAgent = 'ToolsPlatformPhoneIngestor/1.0 (+operator contact required)',
    timeoutMs = 15000,
    maxBytes = 2_000_000,
    retries = 1,
    backoffMs = 750,
  } = {},
) {
  const target = new URL(url);
  const robotsUrl = `${target.protocol}//${target.host}/robots.txt`;
  const robots = await fetchImpl(robotsUrl, {
    headers: { 'user-agent': userAgent },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!robots.ok) throw new IngestionBlockedError(`Robots preflight failed with HTTP ${robots.status}.`, robots.status);
  if (!robotsAllows(await robots.text(), url, userAgent))
    throw new IngestionBlockedError('robots.txt disallows this source URL.');
  let response;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      response = await fetchImpl(url, {
        headers: { 'user-agent': userAgent, accept: 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 403 || response.status === 429)
        throw new IngestionBlockedError(`Source returned stop status ${response.status}.`, response.status);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      break;
    } catch (error) {
      if (error instanceof IngestionBlockedError || attempt === retries) throw error;
      await wait(backoffMs * 2 ** attempt);
    }
  }
  const type = response.headers.get('content-type') ?? '';
  if (!/text\/html|application\/xhtml\+xml/i.test(type))
    throw new IngestionBlockedError(`Unsupported content type: ${type || 'missing'}.`, response.status);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes)
    throw new IngestionBlockedError(`Content length ${declared} exceeds ${maxBytes} bytes.`, response.status);
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes)
    throw new IngestionBlockedError(`Response body exceeds ${maxBytes} bytes.`, response.status);
  if (/captcha|verify you are human|access denied/i.test(body))
    throw new IngestionBlockedError('Anti-bot or CAPTCHA response detected.', response.status);
  return { url, status: response.status, contentType: type, body, hash: sourceHash(body), robotsUrl };
}
export function summarizeChanges(previous, next, prefix = '') {
  const keys = new Set([...Object.keys(previous ?? {}), ...Object.keys(next ?? {})]);
  return [...keys].flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const a = previous?.[key],
      b = next?.[key];
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b))
      return summarizeChanges(a, b, path);
    return JSON.stringify(a) === JSON.stringify(b)
      ? []
      : [{ field: path, previousValue: a, newValue: b, reviewStatus: 'pending' }];
  });
}
