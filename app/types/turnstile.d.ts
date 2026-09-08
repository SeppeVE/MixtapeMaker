// Minimal shape of the Cloudflare Turnstile client API (loaded via <script>
// from https://challenges.cloudflare.com/turnstile/v0/api.js), just enough
// to type the render/reset/remove calls in TurnstileWidget.vue.
export {};

declare global {
  interface TurnstileRenderOptions {
    sitekey: string;
    callback?: (token: string) => void;
    'expired-callback'?: () => void;
    'error-callback'?: () => void;
    theme?: 'light' | 'dark' | 'auto';
  }

  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}
