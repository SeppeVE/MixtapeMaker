<script setup lang="ts">
import { isLibrary3DEnabled } from '~/utils/featureFlags';

// Behind the library3d feature flag; everyone else lands on the regular library.
definePageMeta({
  middleware: (to) => {
    if (!isLibrary3DEnabled(useRuntimeConfig().public.library3d, to.query)) {
      return navigateTo('/library', { replace: true });
    }
  },
});

useHead({ title: '3D Library · Mixtape Maker' });
</script>

<template>
  <div class="lib3d-page">
    <NavBar library>
      <NuxtLink to="/" class="lp-nav-link">◀ Home</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <NuxtLink to="/library" class="lp-nav-link">Library</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span class="lp-nav-current">3D</span>
    </NavBar>
    <div class="lib3d-stage">
      <ClientOnly>
        <Library3D />
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
