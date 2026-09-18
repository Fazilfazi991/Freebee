import { useLocation } from '@remix-run/react';
import { useEffect, useRef } from 'react';
import { analyticsConsentEvent, trackPageView } from '~/lib/analytics';

export function AnalyticsBridge() {
  const location = useLocation();
  const lastPageView = useRef<string>();
  const path = `${location.pathname}${location.search}`;

  useEffect(() => {
    const sendPageView = () => {
      const key = `${path}|${document.title}`;
      if (lastPageView.current === key) return;
      if (trackPageView(path, document.title)) lastPageView.current = key;
    };

    sendPageView();
    window.addEventListener(analyticsConsentEvent, sendPageView);
    return () => window.removeEventListener(analyticsConsentEvent, sendPageView);
  }, [path]);

  return null;
}
