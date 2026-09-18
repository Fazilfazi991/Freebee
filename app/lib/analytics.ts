export type AnalyticsEvent =
  | 'tool_view'
  | 'tool_upload'
  | 'tool_process_started'
  | 'tool_process_completed'
  | 'tool_download'
  | 'tool_error'
  | 'related_tool_click'
  | 'search'
  | 'signup_cta'
  | 'upgrade_cta';

export type AnalyticsProperties = Record<string, string | number | boolean | undefined>;

const allowedProperties = new Set([
  'toolSlug',
  'category',
  'status',
  'processingLocation',
  'errorCode',
  'fileSizeBucket',
  'searchResultCount',
]);

const measurementIdPattern = /^G-[A-Z0-9]+$/i;
const consentStorageKey = 'freebee.analytics.consent';
const consentEventName = 'tool-platform:analytics-consent';
const gaScriptId = 'freebee-ga4-script';
let gaConfigured = false;

type GaFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GaFunction;
  }
}

export function isValidMeasurementId(measurementId: string | undefined) {
  return Boolean(measurementId && measurementIdPattern.test(measurementId));
}

export function sanitizeProperties(properties: AnalyticsProperties = {}) {
  return Object.fromEntries(Object.entries(properties).filter(([key]) => allowedProperties.has(key)));
}

function gaProperties(properties: AnalyticsProperties) {
  return Object.fromEntries(
    Object.entries(sanitizeProperties(properties)).map(([key, value]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      value,
    ]),
  );
}

function measurementId() {
  return import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
}

function isProductionOrExplicitDebug() {
  return import.meta.env.PROD || import.meta.env.VITE_GA_ALLOW_NON_PROD === 'true';
}

export function hasAnalyticsConsent() {
  return typeof window !== 'undefined' && window.localStorage.getItem(consentStorageKey) === 'granted';
}

export function setAnalyticsConsent(granted: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(consentStorageKey, granted ? 'granted' : 'denied');
  window.dispatchEvent(new CustomEvent(consentEventName, { detail: { granted } }));
}

function canUseGa4() {
  return typeof window !== 'undefined' && isProductionOrExplicitDebug() && isValidMeasurementId(measurementId()) && hasAnalyticsConsent();
}

function ensureGa4() {
  if (!canUseGa4()) return false;

  const id = measurementId()!;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
  if (!gaConfigured) {
    window.gtag('js', new Date());
    window.gtag('config', id, {
      send_page_view: false,
      debug_mode: import.meta.env.VITE_GA_DEBUG === 'true',
    });
    gaConfigured = true;
  }

  if (!document.getElementById(gaScriptId)) {
    const script = document.createElement('script');
    script.id = gaScriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
  }

  return true;
}

export function trackPageView(path: string, title: string) {
  if (!ensureGa4()) return false;
  window.gtag?.('event', 'page_view', { page_path: path, page_title: title });
  return true;
}

export function track(event: AnalyticsEvent, properties: AnalyticsProperties = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const safeProperties = sanitizeProperties(properties);
  window.dispatchEvent(new CustomEvent('tool-platform:analytics', { detail: { event, properties: safeProperties } }));

  if (ensureGa4()) {
    window.gtag?.('event', event, {
      ...gaProperties(safeProperties),
      ...(import.meta.env.VITE_GA_DEBUG === 'true' ? { debug_mode: true } : {}),
    });
  }
}

export const analyticsConsentEvent = consentEventName;
