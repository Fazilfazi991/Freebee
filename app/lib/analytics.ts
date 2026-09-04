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

export function track(event: AnalyticsEvent, properties: AnalyticsProperties = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('tool-platform:analytics', { detail: { event, properties } }));
}
