<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';

// Self-contained nav. Reads auth/ui stores directly (no prop-drilling).
// Middle breadcrumb goes in the default slot.
withDefaults(defineProps<{
  library?: boolean;   // show the "Library" button
}>(), {
  library: false,
});

const auth = useAuthStore();
const ui = useUiStore();
</script>

<template>
  <nav class="lp-nav">
    <!-- Logo -->
    <NuxtLink to="/" class="lp-logo">
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
        <rect x="1" y="1" width="18" height="12" rx="2" stroke="#2A1E28" stroke-width="1.5" fill="none" />
        <circle cx="6" cy="8" r="2.5" stroke="#2A1E28" stroke-width="1.5" fill="none" />
        <circle cx="14" cy="8" r="2.5" stroke="#2A1E28" stroke-width="1.5" fill="none" />
        <rect x="4" y="10.5" width="12" height="1" fill="#2A1E28" />
      </svg>
      <span class="lp-logo-text">Mixtape Maker</span>
    </NuxtLink>

    <!-- Middle slot -->
    <div v-if="$slots.default" class="lp-nav-links">
      <slot />
    </div>

    <!-- Right CTAs -->
    <div class="lp-nav-ctas">
      <span v-if="auth.user" class="lp-nav-user">●● {{ auth.user.email?.split('@')[0] }}</span>
      <NuxtLink to="/explore" class="lp-btn lp-btn-paper">Explore</NuxtLink>
      <NuxtLink v-if="library" to="/library" class="lp-btn lp-btn-paper">Library</NuxtLink>
      <button v-if="auth.user" class="lp-btn lp-btn-paper" @click="auth.signOut()">Sign Out</button>
      <button v-else class="lp-btn lp-btn-paper" @click="ui.openAuth()">Sign In</button>
    </div>
  </nav>
</template>
