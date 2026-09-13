// Browser-side Sentry init. Picked up automatically by @sentry/nuxt/module
// from the project root. The DSN is public (it only identifies the project),
// so it comes from runtimeConfig.public → NUXT_PUBLIC_SENTRY_DSN.
import * as Sentry from '@sentry/nuxt';
import { useRuntimeConfig } from '#imports';

const config = useRuntimeConfig();

Sentry.init({
  dsn: config.public.sentry.dsn,
  environment: config.public.sentry.environment || undefined,

  // Keep the client bundle lean: only error reporting for now.
  // Bump these (and add integrations) once we want performance/replay data.
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Don't spam Sentry from local dev unless a DSN is explicitly set.
  enabled: !!config.public.sentry.dsn,
});
