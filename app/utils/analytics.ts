import { track } from '@vercel/analytics';

type EventProps = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    umami?: { track: (name: string, data?: EventProps) => void };
  }
}

/**
 * Custom analytics events, sent to Vercel Analytics and (when its script is
 * loaded, see plugins/umami.client.ts) Umami. Wrapped so a missing/blocked analytics
 * script can never break the UI flow that fired the event.
 *
 * Support-prompt events (see supportPrompt.ts):
 *   support_block_shown       { trigger: 'spotify' | 'share' | 'pdf' }
 *   support_block_clicked     { trigger: 'spotify' | 'share' | 'pdf' | 'footer' | 'library' }
 *   support_block_opted_out   { trigger }
 *   print_checklist_opted_out {}
 */
export function trackEvent(name: string, props?: EventProps): void {
  if (typeof window === 'undefined') return;
  try {
    track(name, props);
  } catch (err) {
    console.debug('analytics event dropped:', name, err);
  }
  try {
    window.umami?.track(name, props);
  } catch (err) {
    console.debug('umami event dropped:', name, err);
  }
}
