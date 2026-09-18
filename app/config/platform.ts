const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/u, '') || 'https://freebee.world';

export const platformConfig = {
  name: 'freebee.world',
  shortName: 'freebee',
  domain: new URL(configuredUrl).hostname,
  url: configuredUrl,
  description: 'Free online tools for PDFs, images, calculators, text and everyday tasks. Fast, simple and easy to use.',
  tagline: 'Useful tools, made simple.',
  logo: '/brand/freebee-world-logo.png',
  icon: '/brand/freebee-icon.png',
  favicon: '/brand/freebee-icon-32.png',
  company: 'freebee.world',
  email: 'info@fusionventuresglobal.com',
  legal: {
    entity: '',
    jurisdiction: '',
    registeredAddress: '',
    governingLaw: '',
    effectiveDate: '',
    privacyEmail: 'info@fusionventuresglobal.com',
    cookieEmail: 'info@fusionventuresglobal.com',
  },
  beta: import.meta.env.VITE_PUBLIC_BETA === 'true',
  feedbackUrl: '',
  social: { x: '', github: '', linkedin: '' },
  colors: { ink: '#171c20', accent: '#ffc21c', paper: '#fbfbfa', signal: '#ffc21c' },
} as const;

export type PlatformConfig = typeof platformConfig;
