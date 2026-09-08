<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRuntimeConfig } from '#app';

// Renders nothing (and never blocks sign-in/sign-up) when no site key is
// configured, so local dev without Turnstile creds keeps working.
const config = useRuntimeConfig();
const siteKey = config.public.turnstileSiteKey as string;

const emit = defineEmits<{
  verify: [token: string];
  expire: [];
  error: [];
}>();

const el = ref<HTMLElement | null>(null);
let widgetId: string | null = null;

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve(), { once: true });
    document.head.appendChild(script);
  });
}

onMounted(async () => {
  if (!siteKey || !el.value) return;
  await loadScript();
  if (!el.value || !window.turnstile) return;
  widgetId = window.turnstile.render(el.value, {
    sitekey: siteKey,
    callback: (token) => emit('verify', token),
    'expired-callback': () => emit('expire'),
    'error-callback': () => emit('error'),
  });
});

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) {
    window.turnstile.remove(widgetId);
  }
});

/** Tokens are single-use — call after every submit attempt (success or failure). */
function reset() {
  if (widgetId && window.turnstile) {
    window.turnstile.reset(widgetId);
  }
}

defineExpose({ reset });
</script>

<template>
  <div v-if="siteKey" ref="el" class="turnstile-widget"></div>
</template>
