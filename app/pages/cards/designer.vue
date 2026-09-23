<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import { useMixtapeStore } from '~/stores/mixtape';

const store = useMixtapeStore();
const router = useRouter();

// ── Footer placement ────────────────────────────────────────────────────────
// The desktop designer is a fixed-height workspace, so the footer normally sits
// in view under the previews. On shorter screens (a 16" laptop at 1080p) that
// squeezes the previews into a scrolling box while the footer keeps its space.
// When the previews would not fit above the footer, the workspace takes the
// full viewport instead and the footer moves below the fold, reachable by
// scrolling the page — the same natural-scroll model mobile uses.
const pageRef = ref<HTMLElement | null>(null);
const footerBelow = ref(false);
const chromeHeight = ref(0);

const MOBILE_BREAKPOINT = 768; // keep in sync with JCardView.css
// Flip back to "footer in view" only once the previews fit with room to spare,
// so a scrollbar appearing or disappearing can never make the layout flicker.
const HYSTERESIS_PX = 24;

let observer: ResizeObserver | null = null;
let raf = 0;

function measure() {
  const page = pageRef.value;
  if (!page) return;
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    footerBelow.value = false;
    return;
  }
  const preview = page.querySelector<HTMLElement>('.jcard-view-preview');
  const toolbar = page.querySelector<HTMLElement>('.jcard-view-toolbar');
  const footer = page.querySelector<HTMLElement>('.jcard-page-footer');
  const nav = page.querySelector<HTMLElement>('.lp-nav');
  const warning = page.querySelector<HTMLElement>('.designer-mobile-warning');
  if (!preview || !footer) return;

  // Natural height of the preview column (its children, gaps and padding),
  // independent of how tall its scroll box currently is.
  const cs = getComputedStyle(preview);
  const padding = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  const gap = parseFloat(cs.rowGap) || 0;
  const children = Array.from(preview.children) as HTMLElement[];
  const contentHeight =
    children.reduce((sum, el) => sum + el.offsetHeight, 0) +
    gap * Math.max(children.length - 1, 0) +
    padding;

  const chrome = (nav?.offsetHeight ?? 0) + (warning?.offsetHeight ?? 0);
  const needed = chrome + (toolbar?.offsetHeight ?? 0) + contentHeight;
  const availableWithFooter = window.innerHeight - footer.offsetHeight;

  chromeHeight.value = chrome;
  footerBelow.value = footerBelow.value
    ? needed > availableWithFooter - HYSTERESIS_PX
    : needed > availableWithFooter;
}

function scheduleMeasure() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(measure);
}

onMounted(async () => {
  await nextTick();
  measure();
  if (typeof ResizeObserver === 'undefined' || !pageRef.value) return;
  observer = new ResizeObserver(scheduleMeasure);
  // Preview cards resize with their column width and the "Actual size" toggle;
  // the footer wraps at narrower widths.
  pageRef.value
    .querySelectorAll<HTMLElement>('.jcard-preview-root, .jcard-page-footer')
    .forEach((el) => observer?.observe(el));
});

onBeforeUnmount(() => {
  observer?.disconnect();
  cancelAnimationFrame(raf);
});

useEventListener(typeof window !== 'undefined' ? window : null, 'resize', scheduleMeasure);
</script>

<template>
  <div
    ref="pageRef"
    :class="`editor editor-side-a jcard-page${footerBelow ? ' jcard-page--footer-below' : ''}`"
    :style="{ '--jcard-chrome-h': `${chromeHeight}px` }"
  >
    <NavBar library>
      <button class="lp-nav-link" @click="router.back()">Back</button>
      <span class="lp-nav-sep">/</span>
      <span class="lp-nav-current">Designer</span>
    </NavBar>
    <div class="designer-mobile-warning">
      This designer is built for desktop — layout and editing work best on a wider screen.
    </div>
    <div class="jcard-page-body">
      <JCardView :initial-card="store.activeCard" :current-mixtape="store.mixtape" />
    </div>
    <div class="jcard-page-footer">
      <HomeFooter />
    </div>
  </div>
</template>

<style scoped>
/* ── Desktop-only warning banner (hidden on desktop) ── */
.designer-mobile-warning {
  display: none;
}

/* ── Page: designer fills the space, footer pinned below it (like the mixtape editor) ── */
.jcard-page {
  overflow-y: auto;
}

.jcard-page-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.jcard-page-footer {
  flex-shrink: 0;
}

/* Screen too short for previews + footer: the workspace takes the whole viewport
   and the footer waits below the fold (designer.vue measures and sets this). */
.jcard-page--footer-below .jcard-page-body {
  flex: 0 0 auto;
  height: calc(100vh - var(--jcard-chrome-h, 0px));
}

@media screen and (max-width: 768px) {
  /* Natural scroll on mobile: the page scrolls as a whole and the footer sits at the end */
    .jcard-page-body,
    .jcard-page--footer-below .jcard-page-body {
      flex: none;
      height: auto;
      overflow: visible;
    }

  /* Show the warning */
    .designer-mobile-warning {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--color-mustard);
      border-bottom: 2px solid var(--color-text);
      padding: 8px 14px;
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text);
      flex-shrink: 0;
    }
}
</style>
