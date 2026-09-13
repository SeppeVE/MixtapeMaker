// Server-side (Nitro) Sentry init. Picked up automatically by
// @sentry/nuxt/module from the project root and injected at the top of the
// server entry (see `sentry.autoInjectServerSentry` in nuxt.config.ts), which
// is what Vercel's serverless runtime needs — there is no `node --import`
// hook to preload it there.
import * as Sentry from '@sentry/nuxt';

const dsn = process.env.SENTRY_DSN || process.env.NUXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || undefined,
  tracesSampleRate: 0,
  enabled: !!dsn,
});
