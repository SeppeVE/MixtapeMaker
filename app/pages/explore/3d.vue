<script setup lang="ts">
import { isLibrary3DEnabled } from '~/utils/featureFlags';

// Everyone's public tapes on the 3D shelf. Behind the library3d feature flag;
// everyone else lands on the Explore grid.
definePageMeta({
  middleware: (to) => {
    if (!isLibrary3DEnabled(useRuntimeConfig().public.library3d, to.query)) {
      return navigateTo('/explore', { replace: true });
    }
  },
});

useHead({ title: 'Explore · 3D shelf · Mixtape Maker' });
// The 2D/3D switch sits in the shelf's toolbar (see Overlay.vue).
</script>

<template>
  <div class="lib3d-page">
    <NavBar library>
      <NuxtLink to="/" class="lp-nav-link">◀ Home</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span class="lp-nav-current">Explore</span>
    </NavBar>
    <div class="lib3d-stage">
      <ClientOnly>
        <Library3D community />
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
