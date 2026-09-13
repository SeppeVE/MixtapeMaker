<script setup lang="ts">
// Test page for the Sentry setup. Clicking the button hits an API route that
// throws on the server, then throws in the browser, so both the Nitro and the
// client SDK should each report one error. Safe to delete once verified.
import { ref } from 'vue';
import { useSeoMeta } from '#app';
import * as Sentry from '@sentry/nuxt';

useSeoMeta({
  title: 'Sentry example page — Mixtape Maker',
  robots: 'noindex, nofollow',
});

class SentryExampleFrontendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SentryExampleFrontendError';
  }
}

const status = ref<'idle' | 'sent' | 'no-dsn'>('idle');
const hasDsn = !!Sentry.getClient()?.getDsn();

async function throwSampleError() {
  if (!hasDsn) {
    status.value = 'no-dsn';
    return;
  }

  status.value = 'sent';

  // Server-side error: reported by sentry.server.config.ts.
  // The request fails with a 500, so swallow the fetch rejection here —
  // what we want is the server-side report, not a second client report.
  await $fetch('/api/sentry-example-api').catch(() => {});

  // Client-side error: reported by sentry.client.config.ts via the Vue
  // error handler. Left uncaught on purpose.
  throw new SentryExampleFrontendError(
    'This error is raised on the frontend of the Mixtape Maker example page.'
  );
}
</script>

<template>
  <div class="gd-page">
    <NavBar library>
      <NuxtLink to="/" class="lp-nav-link">◀ Home</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span style="font-family:var(--font-body);font-size:13px;color:var(--color-text)">Sentry test</span>
    </NavBar>

    <header class="gd-header">
      <div class="gd-header-inner">
        <div class="gd-eyebrow">◆ SENTRY EXAMPLE PAGE</div>
        <h1 class="gd-title">Throw a test error</h1>
        <p class="gd-subhead">
          Click the button to raise one error on the server and one in the browser.
          Both should show up in the Sentry project within a minute or so.
        </p>
      </div>
    </header>

    <div class="gd-body">
      <main class="gd-main">
        <button type="button" class="sentry-example-btn" @click="throwSampleError">
          Throw sample error
        </button>

        <p v-if="status === 'sent'" class="sentry-example-note">
          Errors sent. Check the Sentry issues list for
          <code>SentryExampleAPIError</code> and <code>SentryExampleFrontendError</code>.
        </p>
        <p v-else-if="status === 'no-dsn'" class="sentry-example-note sentry-example-warn">
          Sentry is not configured: set <code>NUXT_PUBLIC_SENTRY_DSN</code> (and
          <code>SENTRY_DSN</code> for the server) and restart the app.
        </p>
        <p v-else class="sentry-example-note">
          Sentry client {{ hasDsn ? 'is' : 'is not' }} initialised on this page.
        </p>
      </main>
    </div>
  </div>
</template>

<style scoped>
.sentry-example-btn {
  font-family: var(--font-body);
  font-size: 15px;
  padding: 10px 18px;
  border: 2px solid var(--color-text);
  background: var(--color-text);
  color: var(--color-bg, #fff);
  cursor: pointer;
}
.sentry-example-btn:hover {
  background: transparent;
  color: var(--color-text);
}
.sentry-example-note {
  margin-top: 16px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--color-text);
}
.sentry-example-warn {
  color: #b00020;
}
.sentry-example-note code {
  font-family: var(--font-mono, monospace);
  font-size: 13px;
}
</style>
