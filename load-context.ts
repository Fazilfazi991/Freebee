import { type PlatformProxy } from 'wrangler';

type Cloudflare = Omit<PlatformProxy<Record<string, unknown>>, 'dispose'>;

declare module '@remix-run/cloudflare' {
  interface AppLoadContext {
    cloudflare: Cloudflare;
  }
}
