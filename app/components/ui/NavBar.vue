<script setup lang="ts">
import '~/assets/styles/NavBar.css';

withDefaults(
  defineProps<{
    onGoHome: () => void;
    onOpenAuth: () => void;
    onOpenLibrary?: () => void; // renders "Library" button when provided
    onSave?: () => void; // renders "Save" button when provided
    isSaving?: boolean;
  }>(),
  { onOpenLibrary: undefined, onSave: undefined, isSaving: false }
);

const { user, signOut } = useAuth();
</script>

<template>
  <nav class="lp-nav">
    <!-- Logo -->
    <button class="lp-logo" @click="onGoHome">
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
        <rect x="1" y="1" width="18" height="12" rx="2" stroke="#2A1E28" stroke-width="1.5" fill="none" />
        <circle cx="6" cy="8" r="2.5" stroke="#2A1E28" stroke-width="1.5" fill="none" />
        <circle cx="14" cy="8" r="2.5" stroke="#2A1E28" stroke-width="1.5" fill="none" />
        <rect x="4" y="10.5" width="12" height="1" fill="#2A1E28" />
      </svg>
      <span class="lp-logo-text">
        Mixtape Maker
      </span>
    </button>

    <!-- Middle slot -->
    <div v-if="$slots.default" class="lp-nav-links">
      <slot />
    </div>

    <!-- Right CTAs -->
    <div class="lp-nav-ctas">
      <span v-if="user" class="lp-nav-user">●● {{ user.email?.split('@')[0] }}</span>
      <button class="lp-btn lp-btn-paper" @click="navigateTo('/explore')">Explore</button>
      <button v-if="onOpenLibrary" class="lp-btn lp-btn-paper" @click="onOpenLibrary">Library</button>
      <button v-if="onSave" class="lp-btn lp-btn-paper" :disabled="isSaving" @click="onSave">
        {{ isSaving ? 'Saving…' : 'Save' }}
      </button>
      <button v-if="user" class="lp-btn lp-btn-paper" @click="signOut">Sign Out</button>
      <button v-else class="lp-btn lp-btn-paper" @click="onOpenAuth">Sign In</button>
    </div>
  </nav>
</template>
