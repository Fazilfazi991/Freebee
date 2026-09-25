import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validatePublicMp4 } from './reel-url.server';

function dnsResponse(address = '93.184.215.14'): Response {
  return new Response(JSON.stringify({ Status: 0, Answer: [{ type: address.includes(':') ? 28 : 1, data: address }] }), { status: 200 });
}

describe('public MP4 URL validation', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it.each(['http://video.example/reel.mp4', 'file:///reel.mp4', 'https://localhost/reel.mp4',
    'https://127.0.0.1/reel.mp4', 'https://192.168.1.5/reel.mp4',
    'https://169.254.169.254/reel.mp4', 'https://api.vercel.com/reel.mp4',
    'https://team.vercel.com/reel.mp4', 'https://yzxhckeyktgxpflnrtne.supabase.co/auth/v1/reel.mp4',
    'https://video.example/reel.mp4?signature=secret'])('rejects unsafe source %s before network access', async (url) => {
    await expect(validatePublicMp4(url)).rejects.toMatchObject({ code: 'invalid_video_url' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a hostname resolving to a private address', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(dnsResponse('10.1.2.3')).mockResolvedValueOnce(dnsResponse());
    await expect(validatePublicMp4('https://video.example/reel.mp4')).rejects.toMatchObject({ code: 'invalid_video_url' });
  });

  it('rejects a redirect into a private network before fetching it', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(dnsResponse()).mockResolvedValueOnce(dnsResponse())
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: 'https://127.0.0.1/reel.mp4' } }));
    await expect(validatePublicMp4('https://video.example/reel.mp4')).rejects.toMatchObject({ code: 'invalid_video_url' });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('accepts a public MP4 with an appropriate type and size', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(dnsResponse()).mockResolvedValueOnce(dnsResponse('2606:4700::1111'))
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { 'Content-Type': 'video/mp4', 'Content-Length': '5000000' } }));
    expect(await validatePublicMp4('https://video.example/reel.mp4')).toBe('https://video.example/reel.mp4');
  });

  it('rejects an oversized video without downloading it', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(dnsResponse()).mockResolvedValueOnce(dnsResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { 'Content-Type': 'video/mp4', 'Content-Length': '400000000' } }));
    await expect(validatePublicMp4('https://video.example/reel.mp4')).rejects.toMatchObject({ code: 'invalid_video_size' });
    expect(vi.mocked(fetch).mock.calls[2][1]?.method).toBe('HEAD');
  });
});
