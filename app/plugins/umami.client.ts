import { defineNuxtPlugin, useRuntimeConfig, useHead } from '#app';

// Self-hosted Umami analytics, running alongside Vercel Analytics. Only loads
// when both env vars are set, so local dev and unconfigured previews stay
// untracked. Umami follows client-side route changes on its own.
export default defineNuxtPlugin(() => {
  const { scriptUrl, websiteId } = useRuntimeConfig().public.umami;
  if (!scriptUrl || !websiteId) return;

  useHead({
    script: [{ src: scriptUrl, defer: true, 'data-website-id': websiteId }],
  });
});
