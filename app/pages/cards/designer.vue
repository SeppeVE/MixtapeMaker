<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useMixtapeStore } from '~/stores/mixtape';

const store = useMixtapeStore();
const router = useRouter();
</script>

<template>
  <div class="editor editor-side-a" style="overflow-y:auto">
    <NavBar library>
      <button class="lp-nav-link" @click="router.back()">Back</button>
      <span class="lp-nav-sep">/</span>
      <span style="font-family:var(--font-body);font-size:13px;color:var(--color-text)">Designer</span>
    </NavBar>
    <div class="designer-mobile-warning">
      This designer is built for desktop — layout and editing work best on a wider screen.
    </div>
    <div style="flex:1;overflow-y:auto">
      <JCardView :initial-card="store.activeCard" :current-mixtape="store.mixtape" />
    </div>
    <div class="jcard-page-footer">
      <HomeFooter />
    </div>
  </div>
</template>
