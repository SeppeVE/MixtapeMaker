<script setup lang="ts">
import { useTemplateRef, watch } from 'vue';
import { useCassetteScene } from '~/composables/useCassetteScene';
import { setLibraryView } from '~/utils/localStorage';
import Overlay from './Overlay.vue';

// Mounts the 3D canvas and the HTML overlay on top of it. Render it inside
// <ClientOnly>: WebGL has nothing to render on the server. (Not a .client.vue:
// Nuxt's client-only wrapper runs onMounted before template refs are bound.)
const props = defineProps<{
  /** Show this user's public shelf instead of your library. */
  username?: string;
}>();
const container = useTemplateRef<HTMLElement>('canvasHost');
const {
  status, textureStatus, tape, shelf, hovered, selected, selectedTape,
  request, step, flip, select, highlight, setShelfView, updateMixtape, removeTape, addMixtapeId, muted, setMuted,
} = useCassetteScene(container, { username: props.username });

// Where to go when the 3D view can't run.
const fallback = props.username
  ? { to: `/user/${props.username}`, label: 'Open the profile page' }
  : { to: { path: '/library', query: { view: '2d' } }, label: 'Open the regular library' };

// No WebGL 2 here: /library shouldn't keep sending this browser to the 3D view.
watch(status, (s) => {
  if (s === 'unsupported') setLibraryView('2d');
});
</script>

<template>
  <div class="lib3d">
    <div ref="canvasHost" class="lib3d-canvas" />
    <Overlay
      v-if="status === 'ready'"
      :tape="tape"
      :shelf="shelf"
      :hovered="hovered"
      :selected="selected"
      :selected-tape="selectedTape"
      :muted="muted"
      @request="request"
      @step="step"
      @flip="flip"
      @select="select"
      @highlight="highlight"
      @view="setShelfView"
      @updated="updateMixtape"
      @deleted="removeTape"
      @saved="addMixtapeId"
      @mute="setMuted"
    />
    <div v-if="status === 'ready' && shelf.status === 'loading'" class="lib3d-hint" role="status">
      {{ props.username ? `Fetching @${props.username}'s tapes…` : 'Fetching your tapes…' }}
    </div>
    <div v-else-if="status === 'ready' && textureStatus === 'loading' && tape.target !== 'onShelf'" class="lib3d-hint" role="status">Printing the J-card…</div>
    <div v-if="status !== 'ready'" class="lib3d-notice" role="status">
      <template v-if="status === 'loading'">Loading 3D library…</template>
      <template v-else-if="status === 'contextLost'">The 3D view lost its graphics context. It will resume when the browser restores it.</template>
      <template v-else-if="status === 'unsupported'">
        Your browser doesn't support WebGL 2, so the 3D library can't run here.
        <NuxtLink :to="fallback.to">{{ fallback.label }}</NuxtLink>
      </template>
      <template v-else>
        Something went wrong starting the 3D library.
        <NuxtLink :to="fallback.to">{{ fallback.label }}</NuxtLink>
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
.lib3d-hint {
  position: absolute;
  left: 50%;
  top: 16px;
  transform: translateX(-50%);
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-paper);
  opacity: 0.7;
  pointer-events: none;
}
@media (max-width: 719px) {
  /* Below the folded tape panel. */
  .lib3d-hint {
    top: 64px;
  }
}
.lib3d-notice a {
  display: block;
  margin-top: 8px;
  color: inherit;
  text-decoration: underline;
}
</style>
