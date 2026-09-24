<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { isLibrary3DEnabled } from '~/utils/featureFlags';

// A user's public tapes on the 3D shelf. Behind the library3d feature flag;
// everyone else lands on the profile page.
definePageMeta({
  middleware: (to) => {
    if (!isLibrary3DEnabled(useRuntimeConfig().public.library3d, to.query)) {
      return navigateTo(`/user/${String(to.params.username ?? '')}`, { replace: true });
    }
  },
});

const route = useRoute();
const username = computed(() => String(route.params.username ?? '').toLowerCase());
// Back to the profile, keeping a per-visit ?3d=1 so it still links here.
const profileLink = computed(() => ({ path: `/user/${username.value}`, query: route.query['3d'] ? { '3d': route.query['3d'] } : {} }));
useHead({ title: () => `@${username.value} · 3D shelf · Mixtape Maker` });
</script>

<template>
  <div class="lib3d-page">
    <NavBar library>
      <NuxtLink to="/explore" class="lp-nav-link">◀ Explore</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <NuxtLink :to="profileLink" class="lp-nav-link">@{{ username }}</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span class="lp-nav-current">Shelf</span>
    </NavBar>
    <div class="lib3d-stage">
      <ClientOnly>
        <Library3D :key="username" :username="username" />
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.lib3d-page {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #1b1714;
}
.lib3d-stage {
  position: relative;
  flex: 1;
  min-height: 0;
}
</style>
