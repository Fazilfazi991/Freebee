import type { InstagramConfig } from './config.server';
import { IntegrationFailure } from './supabase.server';

const BUCKET = 'instagram-content';
export const MAX_CONTENT_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_CONTENT_COVER_BYTES = 5 * 1024 * 1024;

function assertObjectPath(path: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(?:video\.mp4|cover\.jpg)$/iu.test(path)) {
    throw new IntegrationFailure('invalid_storage_path');
  }
}

function objectEndpoint(config: InstagramConfig, prefix: string, path: string): URL {
  assertObjectPath(path);
  return new URL(`/storage/v1/object/${prefix}/${BUCKET}/${path}`, config.supabaseUrl);
}

async function storageRequest(config: InstagramConfig, url: URL, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: {
      apikey: config.secretKey, Authorization: `Bearer ${config.secretKey}`,
      ...init.headers,
    }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000) });
  } catch { throw new IntegrationFailure('storage_unavailable'); }
  if (!response.ok) throw new IntegrationFailure('storage_unavailable');
  return response;
}

function returnedStorageUrl(config: InstagramConfig, path: string): string {
  // Storage returns a path relative to /storage/v1. Never trust it as another host.
  if (!path.startsWith('/object/')) throw new IntegrationFailure('storage_unavailable');
  const url = new URL(`/storage/v1${path}`, config.supabaseUrl);
  if (url.origin !== new URL(config.supabaseUrl).origin) throw new IntegrationFailure('storage_unavailable');
  return url.toString();
}

export async function createSignedContentUpload(config: InstagramConfig, path: string): Promise<string> {
  const response = await storageRequest(config, objectEndpoint(config, 'upload/sign', path), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  let value: { url?: string };
  try { value = await response.json() as { url?: string }; }
  catch { throw new IntegrationFailure('storage_unavailable'); }
  if (!value.url) throw new IntegrationFailure('storage_unavailable');
  const signed = returnedStorageUrl(config, value.url);
  if (!new URL(signed).searchParams.has('token')) throw new IntegrationFailure('storage_unavailable');
  return signed;
}

export async function createSignedContentDownload(config: InstagramConfig, path: string,
  expiresInSeconds = 3600): Promise<string> {
  if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds < 60 || expiresInSeconds > 86400) {
    throw new IntegrationFailure('invalid_storage_expiry');
  }
  const response = await storageRequest(config, objectEndpoint(config, 'sign', path), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
  });
  let value: { signedURL?: string };
  try { value = await response.json() as { signedURL?: string }; }
  catch { throw new IntegrationFailure('storage_unavailable'); }
  if (!value.signedURL) throw new IntegrationFailure('storage_unavailable');
  const signed = returnedStorageUrl(config, value.signedURL);
  if (!new URL(signed).searchParams.has('token')) throw new IntegrationFailure('storage_unavailable');
  return signed;
}

export async function getStoredContentFile(config: InstagramConfig, path: string): Promise<{ size: number; mime: string }> {
  const response = await storageRequest(config, objectEndpoint(config, 'authenticated', path), { method: 'HEAD' });
  const size = Number(response.headers.get('Content-Length'));
  const mime = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() ?? '';
  if (!Number.isSafeInteger(size) || size <= 0) throw new IntegrationFailure('invalid_storage_file');
  return { size, mime };
}

export async function getStoredContentPrefix(config: InstagramConfig, path: string, length = 32): Promise<Uint8Array> {
  const response = await storageRequest(config, objectEndpoint(config, 'authenticated', path), {
    method: 'GET', headers: { Range: `bytes=0-${length - 1}` },
  });
  const reader = response.body?.getReader();
  if (!reader) throw new IntegrationFailure('invalid_storage_file');
  try {
    const first = await reader.read();
    return first.value?.slice(0, length) ?? new Uint8Array();
  } finally { await reader.cancel().catch(() => undefined); }
}

export function contentPaths(id: string): { video: string; cover: string } {
  const video = `${id}/video.mp4`;
  const cover = `${id}/cover.jpg`;
  assertObjectPath(video); assertObjectPath(cover);
  return { video, cover };
}
