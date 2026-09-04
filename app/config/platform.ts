export const platformConfig = {
  name: 'Tool Platform',
  shortName: 'TP',
  domain: 'example.com',
  url: 'https://example.com',
  description: 'Fast, focused browser tools for files, data, media, and everyday work.',
  company: 'Tool Platform',
  email: 'hello@example.com',
  social: { x: '', github: '', linkedin: '' },
  colors: { ink: '#17211b', accent: '#146b45', paper: '#f7f5ee', signal: '#d9f36f' },
} as const;

export type PlatformConfig = typeof platformConfig;
