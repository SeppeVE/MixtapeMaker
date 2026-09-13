// Throws on purpose so the server-side Sentry setup can be verified from
// /sentry-example-page. Safe to delete once Sentry is confirmed working.
class SentryExampleAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SentryExampleAPIError';
  }
}

export default defineEventHandler(() => {
  throw new SentryExampleAPIError(
    'This error is raised on the server-side of the Mixtape Maker example page.'
  );
});
