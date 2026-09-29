<script setup lang="ts">
import { useRoute } from 'vue-router';
import { setLibraryView, type LibraryView } from '~/utils/localStorage';

// 2D list ↔ 3D shelf, for your library or for Explore. The library remembers the
// choice in localStorage: /library opens the shelf next time while the library3d
// flag is on. Explore always opens as the grid. A per-visit ?3d=1 rides along.
const props = withDefaults(defineProps<{ current: LibraryView; dark?: boolean; area?: 'library' | 'explore' }>(), {
  dark: false,
  area: 'library',
});
const route = useRoute();
const PATHS = {
  library: { '2d': '/library', '3d': '/library/3d' },
  explore: { '2d': '/explore', '3d': '/explore/3d' },
} as const;
const NAMES = { library: 'Library', explore: 'Explore' } as const;

function linkTo(view: LibraryView) {
  const query = route.query['3d'] ? { '3d': route.query['3d'] } : {};
  return { path: PATHS[props.area][view], query };
}
function choose(view: LibraryView) {
  if (props.area === 'library') setLibraryView(view);
}
</script>

<template>
  <div :class="['lib-view-toggle', { 'lib-view-toggle--dark': props.dark }]" role="group" :aria-label="`${NAMES[props.area]} view`">
    <NuxtLink
      v-for="view in (['2d', '3d'] as const)"
      :key="view"
      :to="linkTo(view)"
      :class="['lib-view-toggle-btn', { 'lib-view-toggle-btn--on': view === props.current }]"
      :aria-current="view === props.current ? 'page' : undefined"
      :title="`${NAMES[props.area]} ${view === '2d' ? 'as a list' : 'as a 3D shelf'}`"
      @click="choose(view)"
    >
      {{ view.toUpperCase() }}
    </NuxtLink>
  </div>
</template>

<style scoped>
.lib-view-toggle {
  display: inline-flex;
  pointer-events: auto; /* also over the 3D canvas, where the overlay lets clicks through */
  border: 1.5px solid currentColor;
  border-radius: 4px;
  overflow: hidden;
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1;
  color: var(--color-text, #2a1e28);
}
.lib-view-toggle--dark {
  color: var(--color-paper, #f2ebd9);
  background: rgba(20, 16, 13, 0.78);
  border-color: rgba(242, 235, 217, 0.3);
}
.lib-view-toggle-btn {
  padding: 6px 10px;
  color: inherit;
  text-decoration: none;
  opacity: 0.7;
}
.lib-view-toggle-btn:hover {
  opacity: 1;
}
.lib-view-toggle-btn--on {
  opacity: 1;
  color: var(--color-paper, #f2ebd9);
  background: var(--color-text, #2a1e28);
  pointer-events: none;
}
.lib-view-toggle--dark .lib-view-toggle-btn--on {
  color: #1b1714;
  background: var(--color-paper, #f2ebd9);
}
</style>
