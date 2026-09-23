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

useSeoMeta({
  title: () => (activeTab.value === 'jcards' ? 'Explore J-Cards — Mixtape Maker' : 'Explore — Mixtape Maker'),
  description: () => (activeTab.value === 'jcards'
    ? 'Browse public cassette J-cards designed by the community.'
    : 'Browse public cassette mixtapes made by the community.'),
});
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
