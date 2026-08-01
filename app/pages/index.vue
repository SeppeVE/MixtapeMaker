<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Mixtape } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { loadMixtapes } from '~/utils/database';

const auth = useAuthStore();
const recentTapes = ref<Mixtape[]>([]);

async function loadRecent() {
  if (!auth.user) {
    recentTapes.value = [];
    return;
  }
  try {
    const tapes = await loadMixtapes(auth.user.id);
    recentTapes.value = tapes.slice(0, 3);
  } catch {
    /* ignore */
  }
}

onMounted(loadRecent);
watch(() => auth.user, loadRecent);
</script>

<template>
  <div class="lp-page">
    <NavBar library>
      <a href="#mixtape" class="lp-nav-link">Mixtape</a>
      <a href="#jcard" class="lp-nav-link">J-Card</a>
      <a href="#how-it-works" class="lp-nav-link">How it works</a>
    </NavBar>

    <TapeStrip />
    <HeroSection />
    <FeatureBar />
    <MixtapeSection />
    <JCardSection />
    <HowItWorksSection />
    <CtaSection :recent-tapes="recentTapes" />
    <HomeFooter />
  </div>
</template>
