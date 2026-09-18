export function loader() {
  const key = import.meta.env.VITE_INDEXNOW_KEY;
  if (!key) return new Response('Not configured', { status: 404 });
  return new Response(key, { headers: { 'content-type': 'text/plain', 'cache-control': 'public, max-age=3600' } });
}
