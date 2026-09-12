<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { Mixtape, Profile, JCard } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { useMixtapeStore } from '~/stores/mixtape';
import { generateId } from '~/utils/timeUtils';

const props = withDefaults(defineProps<{
  mixtape: Mixtape | null;
  loading: boolean;
  notFound: boolean;
  breadcrumbLabel: string;
  notFoundSub: string;
  showBack?: boolean;
  /** Who made it — renders a byline linking to their profile. */
  author?: Profile | null;
  /** Public J-cards designed for this mixtape, shown below the track list. */
  jcards?: JCard[];
}>(), {
  showBack: false,
  author: null,
  jcards: () => [],
});

const auth = useAuthStore();
const ui = useUiStore();
const store = useMixtapeStore();
const router = useRouter();

function goBack() {
  if (window.history.state?.back) {
    router.back();
  } else {
    router.push('/explore');
  }
}

function handleCopy() {
  if (!props.mixtape) return;
  if (!auth.user) {
    ui.openAuth();
    return;
  }
  const now = new Date().toISOString();
  const copy: Mixtape = {
    ...props.mixtape,
    id: generateId(),
    userId: undefined,
    isPublic: false,
    shareToken: null,
    isCopy: true,
    createdAt: now,
    updatedAt: now,
  };
  store.loadMixtape(copy);
  ui.showToast('Copied to your mixtape — personalize and save it', 'success');
}
</script>

<template>
  <div class="lib-page">
    <NavBar library>
      <button v-if="showBack" class="lp-nav-link" @click="goBack">◀ Back</button>
      <NuxtLink v-else to="/" class="lp-nav-link">◀ Home</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span style="font-family:var(--font-body);font-size:13px;color:var(--color-text)">{{ breadcrumbLabel }}</span>
    </NavBar>

    <div class="lib-content">
      <p v-if="loading" style="padding:40px;text-align:center">Loading…</p>

      <div v-else-if="notFound" class="lib-empty">
        <div class="lib-empty-icon">📼</div>
        <p>This mixtape isn't available.</p>
        <p class="lib-empty-sub">{{ notFoundSub }}</p>
      </div>

      <div v-else-if="mixtape" class="lib-section-stack">
        <section class="lib-section">
          <div class="lib-section-head">
            <span>{{ mixtape.title }}</span>
            <button class="lp-btn lp-btn-forest" @click="handleCopy">⎘ Copy to my library</button>
          </div>
          <p v-if="mixtape.dedicatedTo" style="margin-bottom:16px;font-style:italic">For {{ mixtape.dedicatedTo }}</p>
          <p v-if="author" style="margin-bottom:16px">
            <AuthorByline :profile="author" prefix="Made by" />
          </p>

          <div style="max-width:320px;margin-bottom:24px">
            <CassetteSVG :title="mixtape.title" side="A" :float="false" />
          </div>

          <div style="margin-bottom:24px;width:max-content">
            <ExportToSpotify :mixtape="mixtape" />
          </div>

          <div class="tape-sides-grid">
            <ReadOnlySide label="Side A" :songs="mixtape.sideA" />
            <ReadOnlySide label="Side B" :songs="mixtape.sideB" />
          </div>
        </section>

        <section v-if="jcards.length > 0" class="lib-section">
          <div class="lib-section-head">
            <span>J-Card{{ jcards.length === 1 ? '' : 's' }} for this tape</span>
            <span class="lib-section-sub">{{ jcards.length }} public design{{ jcards.length === 1 ? '' : 's' }}</span>
          </div>
          <div class="detail-jcards">
            <div v-for="card in jcards" :key="card.id">
              <h3 class="detail-jcard-title">
                <span>🎴 {{ card.title || 'Untitled J-Card' }}</span>
                <NuxtLink :to="`/jcard/${card.id}`" class="pf-inline-link" style="font-family:var(--font-body);font-size:12px">Open ↗</NuxtLink>
              </h3>
              <JCardReadOnly :content="card.content" />
            </div>
          </div>
        </section>
      </div>
    </div>
    <HomeFooter />
  </div>
</template>
