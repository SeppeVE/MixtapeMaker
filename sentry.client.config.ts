// Browser-side Sentry init. Picked up automatically by @sentry/nuxt/module
// from the project root. The DSN is public (it only identifies the project),
// so it comes from runtimeConfig.public → NUXT_PUBLIC_SENTRY_DSN.
import * as Sentry from '@sentry/nuxt';
import { useRuntimeConfig } from '#imports';

const config = useRuntimeConfig();

Sentry.init({
  dsn: config.public.sentry.dsn,
  environment: config.public.sentry.environment || undefined,

  integrations: [
    // Session Replay: a DOM recording of what the user saw around an error.
    // Text is masked and images/media are blocked before anything leaves the
    // browser, so mixtape titles, J-card text, emails and cover art never
    // reach Sentry — only layout, clicks and navigation do.
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // No performance tracing yet; bump this once we want it.
  tracesSampleRate: 0,

  // Replay sampling. Every session that hits an error is recorded (the
  // buffer holds the last ~60s before the error), plus a 10% sample of
  // ordinary sessions so we can also see how people use the editor.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Don't spam Sentry from local dev unless a DSN is explicitly set.
  enabled: !!config.public.sentry.dsn,
});
