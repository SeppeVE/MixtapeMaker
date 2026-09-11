<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { useProfileStore } from '~/stores/profile';

// Self-contained nav. Reads auth/ui stores directly (no prop-drilling).
// Middle breadcrumb goes in the default slot.
withDefaults(defineProps<{
  library?: boolean;   // show the "Library" button
}>(), {
  library: false,
});

const auth = useAuthStore();
const ui = useUiStore();
const profileStore = useProfileStore();
</script>

<template>
  <nav class="lp-nav">
    <!-- Logo -->
    <NuxtLink to="/" class="lp-logo">
      <img
        class="lp-logo-icon"
        src="/android-chrome-192x192.png"
        width="28"
        height="28"
        alt=""
        aria-hidden="true"
      >
      <span class="lp-logo-text">Mixtape Maker</span>
    </NuxtLink>

    <!-- Middle slot -->
    <div v-if="$slots.default" class="lp-nav-links">
      <slot />
    </div>

    <!-- Right CTAs -->
    <div class="lp-nav-ctas">
      <NuxtLink v-if="auth.user" to="/profile" class="lp-nav-user" title="Your profile">
        <img
          v-if="profileStore.profile?.avatarUrl"
          :src="profileStore.profile.avatarUrl"
          class="lp-nav-avatar"
          alt=""
          width="22"
          height="22"
        >
        <span v-else aria-hidden="true">●●</span>
        {{ profileStore.displayName }}
      </NuxtLink>
      <NuxtLink v-if="profileStore.isAdmin" to="/admin" class="lp-btn lp-btn-plum">Admin</NuxtLink>
      <NuxtLink to="/how-to" class="lp-btn lp-btn-paper">Guide</NuxtLink>
      <NuxtLink to="/explore" class="lp-btn lp-btn-paper">Explore</NuxtLink>
      <NuxtLink v-if="library" to="/library" class="lp-btn lp-btn-paper">Library</NuxtLink>
      <button v-if="auth.user" class="lp-btn lp-btn-paper" @click="auth.signOut()">Sign Out</button>
      <button v-else class="lp-btn lp-btn-paper" @click="ui.openAuth()">Sign In</button>
    </div>
  </nav>
</template>
