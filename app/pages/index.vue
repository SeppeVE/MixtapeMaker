<script setup lang="ts">
import type { Mixtape } from '~/types';
import { loadMixtapes } from '~/utils/database';
import '~/assets/styles/home/HomePage.css';

const { user } = useAuth();
const {
  handleNewMixtape,
  handleLoadMixtape,
  isAuthModalOpen,
} = useAppMixtapeState();

const recentTapes = ref<Mixtape[]>([]);

watch(
  user,
  (u) => {
    if (!u) {
      recentTapes.value = [];
      return;
    }
    loadMixtapes(u.id)
      .then((tapes) => { recentTapes.value = tapes.slice(0, 3); })
      .catch(() => {});
  },
  { immediate: import.meta.client }
);

const onOpenLibrary = () => navigateTo('/library');
const onOpenAuth = () => { isAuthModalOpen.value = true; };
const onOpenJCards = () => navigateTo('/library?tab=jcards');
const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
</script>

<template>
  <div class="lp-page">
    <NavBar
      :on-go-home="scrollTop"
      :on-open-auth="onOpenAuth"
      :on-open-library="onOpenLibrary"
    >
      <a href="#mixtape" class="lp-nav-link">Mixtape</a>
      <a href="#jcard" class="lp-nav-link">J-Card</a>
      <a href="#how-it-works" class="lp-nav-link">How it works</a>
    </NavBar>

    <TapeStrip />

    <HeroSection :on-new-mixtape="handleNewMixtape" :on-open-j-cards="onOpenJCards" />

    <FeatureBar />

    <MixtapeSection :on-new-mixtape="handleNewMixtape" />

    <JCardSection :on-open-j-cards="onOpenJCards" />

    <HowItWorksSection />

    <CtaSection
      :on-new-mixtape="handleNewMixtape"
      :on-open-j-cards="onOpenJCards"
      :on-load-mixtape="handleLoadMixtape"
      :user="user"
      :recent-tapes="recentTapes"
    />

    <HomeFooter :on-new-mixtape="handleNewMixtape" :on-open-j-cards="onOpenJCards" />
  </div>
</template>
