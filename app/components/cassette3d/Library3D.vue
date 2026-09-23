<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useCassetteScene } from '~/composables/useCassetteScene';

// Mounts the 3D canvas and the HTML overlay on top of it. Render it inside
// <ClientOnly>: WebGL has nothing to render on the server. (Not a .client.vue:
// Nuxt's client-only wrapper runs onMounted before template refs are bound.)
const container = useTemplateRef<HTMLElement>('canvasHost');
const { status } = useCassetteScene(container);
</script>

<template>
  <div class="lib3d">
    <div ref="canvasHost" class="lib3d-canvas" />
    <div v-if="status !== 'ready'" class="lib3d-notice" role="status">
      <template v-if="status === 'loading'">Loading 3D library…</template>
      <template v-else-if="status === 'contextLost'">The 3D view lost its graphics context. It will resume when the browser restores it.</template>
      <template v-else-if="status === 'unsupported'">
        Your browser doesn't support WebGL 2, so the 3D library can't run here.
        <NuxtLink to="/library">Open the regular library</NuxtLink>
      </template>
      <template v-else>
        Something went wrong starting the 3D library.
        <NuxtLink to="/library">Open the regular library</NuxtLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.lib3d {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.lib3d-canvas {
  position: absolute;
  inset: 0;
}
.lib3d-notice {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  max-width: min(420px, calc(100% - 32px));
  padding: 12px 16px;
  font-family: var(--font-body);
  font-size: 14px;
  text-align: center;
  color: var(--color-paper);
}
.lib3d-notice a {
  display: block;
  margin-top: 8px;
  color: inherit;
  text-decoration: underline;
}
</style>
