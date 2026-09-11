<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { onClickOutside } from '@vueuse/core';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { useProfileStore } from '~/stores/profile';

// Self-contained nav. Reads auth/ui stores directly (no prop-drilling).
// Middle breadcrumb goes in the default slot. On narrow screens the CTAs
// (and the slot links) collapse into a hamburger menu.
withDefaults(defineProps<{
  library?: boolean;   // show the "Library" button
}>(), {
  library: false,
});

const auth = useAuthStore();
const ui = useUiStore();
const profileStore = useProfileStore();
const route = useRoute();

const menuOpen = ref(false);
const navRef = ref<HTMLElement | null>(null);

function closeMenu() {
  menuOpen.value = false;
}
watch(() => route.fullPath, closeMenu);
onClickOutside(navRef, closeMenu);

const initial = computed(() => (profileStore.displayName || '?').slice(0, 1).toUpperCase());

function signIn() {
  closeMenu();
  ui.openAuth();
}
</script>

<template>
  <nav ref="navRef" class="lp-nav" :class="{ 'lp-nav--open': menuOpen }">
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

    <!-- Profile button: left of the breadcrumbs on desktop, inside the menu panel on mobile -->
    <NuxtLink v-if="auth.user" to="/profile" class="lp-btn lp-btn-paper lp-nav-profile lp-nav-profile--inline" title="Your profile">
      <span class="lp-nav-profile-avatar" aria-hidden="true">
        <img v-if="profileStore.profile?.avatarUrl" :src="profileStore.profile.avatarUrl" alt="" >
        <span v-else>{{ initial }}</span>
      </span>
      <span class="lp-nav-profile-name">{{ profileStore.displayName }}</span>
    </NuxtLink>

    <!-- Middle slot -->
    <div v-if="$slots.default" class="lp-nav-links">
      <slot />
    </div>

    <!-- Hamburger (narrow screens only) -->
    <button
      class="lp-nav-burger"
      type="button"
      :aria-expanded="menuOpen"
      aria-controls="lp-nav-menu"
      :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
      @click="menuOpen = !menuOpen"
    >
      <span v-if="auth.user" class="lp-nav-burger-avatar" aria-hidden="true">
        <img v-if="profileStore.profile?.avatarUrl" :src="profileStore.profile.avatarUrl" alt="" >
        <span v-else>{{ initial }}</span>
      </span>
      <span class="lp-nav-burger-icon" aria-hidden="true">{{ menuOpen ? '✕' : '☰' }}</span>
    </button>

    <!-- Right CTAs (inline on desktop, dropdown panel on mobile) -->
    <div id="lp-nav-menu" class="lp-nav-ctas">
      <!-- Slot links repeated inside the mobile panel, since the inline ones are hidden there -->
      <div v-if="$slots.default" class="lp-nav-menu-links">
        <slot />
      </div>

      <NuxtLink v-if="auth.user" to="/profile" class="lp-btn lp-btn-paper lp-nav-profile lp-nav-profile--menu" title="Your profile">
        <span class="lp-nav-profile-avatar" aria-hidden="true">
          <img v-if="profileStore.profile?.avatarUrl" :src="profileStore.profile.avatarUrl" alt="" >
          <span v-else>{{ initial }}</span>
        </span>
        <span class="lp-nav-profile-name">{{ profileStore.displayName }}</span>
      </NuxtLink>
      <NuxtLink v-if="profileStore.isAdmin" to="/admin" class="lp-btn lp-btn-plum">Admin</NuxtLink>
      <NuxtLink to="/how-to" class="lp-btn lp-btn-paper">Guide</NuxtLink>
      <NuxtLink to="/explore" class="lp-btn lp-btn-paper">Explore</NuxtLink>
      <NuxtLink v-if="library" to="/library" class="lp-btn lp-btn-paper">Library</NuxtLink>
      <!-- Sign Out lives on the profile page; signed-in users reach it via the profile button -->
      <button v-if="!auth.user" class="lp-btn lp-btn-paper" @click="signIn">Sign In</button>
    </div>
  </nav>
</template>
