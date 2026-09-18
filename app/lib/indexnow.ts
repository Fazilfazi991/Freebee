export type IndexNowEvent = 'added' | 'updated' | 'deleted';

export type IndexNowSubmission = {
  key: string;
  host: string;
  keyLocation?: string;
  urls: string[];
  event?: IndexNowEvent;
};

/** Submit only URLs whose meaningful content or availability changed. */
export async function submitIndexNow(
  submission: IndexNowSubmission,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (!import.meta.env.VITE_PUBLIC_SITE_URL) {
    throw new Error('IndexNow submissions require VITE_PUBLIC_SITE_URL to be configured for production.');
  }
  const urls = [...new Set(submission.urls)].filter(Boolean).slice(0, 10_000);
  if (!submission.key || !submission.host || !urls.length) throw new Error('IndexNow requires a key, host, and at least one URL.');

  return fetcher('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: submission.host,
      key: submission.key,
      ...(submission.keyLocation ? { keyLocation: submission.keyLocation } : {}),
      urlList: urls,
    }),
  });
}

export const indexNowBatch = (event: IndexNowEvent, urls: string[]) => ({ event, urls: [...new Set(urls)] });
