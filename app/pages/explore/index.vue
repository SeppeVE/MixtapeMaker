<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSeoMeta } from '#app';
import IconCassette from '~icons/ph/cassette-tape';
import IconCard from '~icons/material-symbols/devices-fold-2-sharp';

type Tab = 'mixtapes' | 'jcards';

const route = useRoute();
const router = useRouter();

const activeTab = computed<Tab>(() => (route.query.tab === 'jcards' ? 'jcards' : 'mixtapes'));
function setTab(tab: Tab) {
  if (tab === activeTab.value) return;
  router.replace({ query: tab === 'mixtapes' ? {} : { tab } });
}

const seoTitle = computed(() => (activeTab.value === 'jcards'
  ? 'Explore Cassette J-Card Designs — Mixtape Maker'
  : 'Explore Community Mixtapes & Cassette J-Cards — Mixtape Maker'));
const seoDescription = computed(() => (activeTab.value === 'jcards'
  ? 'Browse cassette J-card designs made by the community. Copy one to your library and make it your own.'
  : 'Browse cassette mixtapes and J-cards made by the community. Find tracklist ideas, listen on Spotify, and copy a tape to remix it.'));

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
});
useBreadcrumbs([{ name: 'Explore', path: '/explore' }]);
</script>

<template>
  <div class="lib-page">
    <div class="lib-screen">
      <NavBar library>
        <NuxtLink to="/" class="lp-nav-link">◀ Home</NuxtLink>
        <span class="lp-nav-sep">/</span>
        <span class="lp-nav-current">Explore</span>
      </NavBar>

      <div class="lib-header">
        <div class="lib-header-inner">
          <div>
            <div class="lib-page-eyebrow">{{ activeTab === 'jcards' ? '◆ COMMUNITY J-CARDS' : '◆ COMMUNITY MIXTAPES' }}</div>
            <h1 class="lib-page-title">Explore</h1>
            <p class="explore-intro">
              {{ activeTab === 'jcards'
                ? 'Cassette J-cards people designed in the J-card designer and made public. Open one to see it up close, or copy it to your library and change the text, colors and fonts to fit your own tape.'
                : 'Mixtapes people planned in the editor and made public: real two-sided tracklists, fitted to a cassette length. Open one to see both sides, listen on Spotify, or copy it to your library to remix it.' }}
            </p>
          </div>
          <div class="lib-tabs">
            <button :class="`lib-tab${activeTab === 'mixtapes' ? ' lib-tab--active' : ''}`" @click="setTab('mixtapes')">
              <IconCassette class="icon-inline" aria-hidden="true" /> Mixtapes
            </button>
            <button :class="`lib-tab${activeTab === 'jcards' ? ' lib-tab--active' : ''}`" @click="setTab('jcards')">
              <IconCard class="icon-inline" aria-hidden="true" /> J-Cards
            </button>
          </div>
        </div>
      </div>

      <div class="lib-content">
        <ExploreMixtapes v-if="activeTab === 'mixtapes'" />
        <ExploreJCards v-else />
      </div>
      <HomeFooterMain />
    </div>
    <HomeFooterRail />
  </div>
</template>

<style scoped>
.explore-intro {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-sage);
  max-width: 560px;
  margin: 14px 0 0;
}
</style>
