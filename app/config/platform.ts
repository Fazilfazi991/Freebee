const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/u, '') || 'https://example.com';

export const platformConfig = {
  name: 'Tool Platform',
  shortName: 'TP',
  domain: new URL(configuredUrl).hostname,
  url: configuredUrl,
  description: 'Fast, focused browser tools for files, data, media, and everyday work.',
  tagline: 'Useful tools, one calm workspace',
  logo: '/favicon.svg',
  favicon: '/favicon.svg',
  company: 'Tool Platform',
  email: 'hello@example.com',
  legal: {
    entity: '',
    jurisdiction: '',
    registeredAddress: '',
    governingLaw: '',
    effectiveDate: '',
    privacyEmail: '',
    cookieEmail: '',
  },
  beta: import.meta.env.VITE_PUBLIC_BETA === 'true',
  feedbackUrl: '',
  social: { x: '', github: '', linkedin: '' },
  colors: { ink: '#17211b', accent: '#146b45', paper: '#f7f5ee', signal: '#d9f36f' },
} as const;

export type PlatformConfig = typeof platformConfig;
