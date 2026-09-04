const forbiddenClientSecrets = [
  'VITE_GITHUB_ACCESS_TOKEN',
  'VITE_GITLAB_ACCESS_TOKEN',
  'VITE_VERCEL_ACCESS_TOKEN',
  'VITE_NETLIFY_ACCESS_TOKEN',
  'VITE_SUPABASE_ACCESS_TOKEN',
];

const exposed = forbiddenClientSecrets.filter((name) => Boolean(process.env[name]?.trim()));

if (exposed.length > 0) {
  console.error(`Refusing to build with server credentials exposed through Vite: ${exposed.join(', ')}`);
  process.exit(1);
}

console.log('Client environment secret guard passed.');
