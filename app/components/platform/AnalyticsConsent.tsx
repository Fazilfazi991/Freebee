import { useEffect, useState } from 'react';
import { hasAnalyticsConsent, setAnalyticsConsent } from '~/lib/analytics';

const consentStorageKey = 'freebee.analytics.consent';
const settingsEventName = 'tool-platform:open-consent-settings';

export function AnalyticsConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(consentStorageKey);
    setVisible(!hasAnalyticsConsent() && stored !== 'denied');
    const openSettings = () => setVisible(true);
    window.addEventListener(settingsEventName, openSettings);
    return () => window.removeEventListener(settingsEventName, openSettings);
  }, []);

  const choose = (granted: boolean) => {
    setAnalyticsConsent(granted);
    setVisible(false);
  };

  return visible ? (
    <aside className="tp-consent" aria-label="Analytics consent">
      <div>
        <strong>Help us improve Freebee</strong>
        <p>We use optional analytics to understand how Freebee is used and improve our tools.</p>
      </div>
      <div className="tp-consent-actions">
        <button type="button" className="tp-button tp-button-secondary" onClick={() => choose(false)}>
          Only necessary
        </button>
        <button type="button" className="tp-button tp-button-primary" onClick={() => choose(true)}>
          Allow analytics
        </button>
      </div>
    </aside>
  ) : null;
}
