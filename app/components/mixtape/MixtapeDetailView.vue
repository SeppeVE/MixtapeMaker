<script setup lang="ts">
import type { Mixtape } from '~/types';
import { generateId, formatTime, calculateTotalDuration } from '~/utils/timeUtils';
import '~/assets/styles/LibraryPage.css';
import '~/assets/styles/TapeSide.css';

const props = defineProps<{
  loader: (key: string) => Promise<Mixtape | null>;
  routeKey: string | undefined;
  breadcrumbLabel: string;
  notFoundSub: string;
}>();

const { user } = useAuth();
const {
  isAuthModalOpen,
  showToast,
  handleLoadMixtape,
} = useAppMixtapeState();

const onGoHome = () => navigateTo('/');
const onOpenAuth = () => { isAuthModalOpen.value = true; };
const onOpenLibrary = () => navigateTo('/library');

const mixtape = ref<Mixtape | null>(null);
const loading = ref(true);
const notFound = ref(false);

watch(
  () => props.routeKey,
  (key) => {
    if (!key) return;
    loading.value = true;
    notFound.value = false;
    props.loader(key)
      .then((result) => {
        if (!result) notFound.value = true;
        else mixtape.value = result;
      })
      .catch(() => { notFound.value = true; })
      .finally(() => { loading.value = false; });
  },
  { immediate: true }
);

const handleCopy = () => {
  if (!mixtape.value) return;
  if (!user.value) {
    onOpenAuth();
    return;
  }
  const now = new Date().toISOString();
  const copy: Mixtape = {
    ...mixtape.value,
    id: generateId(),
    isPublic: false,
    shareToken: null,
    createdAt: now,
    updatedAt: now,
  };
  handleLoadMixtape(copy);
  showToast('Copied to your mixtape — personalize and save it', 'success');
};
</script>

<template>
  <div class="lib-page">
    <NavBar :on-go-home="onGoHome" :on-open-auth="onOpenAuth" :on-open-library="onOpenLibrary">
      <button class="lp-nav-link" @click="onGoHome">◀ Home</button>
      <span class="lp-nav-sep">/</span>
      <span style="font-family: var(--font-body); font-size: 13px; color: var(--color-text)">{{ breadcrumbLabel }}</span>
    </NavBar>

    <div class="lib-content">
      <p v-if="loading" style="padding: 40px; text-align: center">Loading…</p>

      <div v-if="!loading && notFound" class="lib-empty">
        <div class="lib-empty-icon">📼</div>
        <p>This mixtape isn't available.</p>
        <p class="lib-empty-sub">{{ notFoundSub }}</p>
      </div>

      <div v-if="!loading && mixtape" class="lib-section-stack">
        <section class="lib-section">
          <div class="lib-section-head">
            <span>{{ mixtape.title }}</span>
            <button class="lp-btn lp-btn-forest" @click="handleCopy">
              ⎘ Copy to my mixtape
            </button>
          </div>
          <p v-if="mixtape.dedicatedTo" style="margin-bottom: 16px; font-style: italic">For {{ mixtape.dedicatedTo }}</p>

          <div style="max-width: 320px; margin-bottom: 24px">
            <CassetteSVG :title="mixtape.title" side="A" :float="false" />
          </div>

          <div style="margin-bottom: 24px; width: max-content">
            <ExportToSpotify :mixtape="mixtape" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px">
            <div v-for="side in (['A', 'B'] as const)" :key="side" class="tape-side">
              <div class="tape-side-header">
                <span class="side-title">⚏ Side {{ side }}</span>
                <span>{{ (side === 'A' ? mixtape.sideA : mixtape.sideB).length }} trk · {{ formatTime(calculateTotalDuration(side === 'A' ? mixtape.sideA : mixtape.sideB)) }}</span>
              </div>
              <div class="song-list">
                <div v-if="(side === 'A' ? mixtape.sideA : mixtape.sideB).length === 0" class="empty-side">◌ No tracks</div>
                <template v-else>
                  <div
                    v-for="(song, index) in (side === 'A' ? mixtape.sideA : mixtape.sideB)"
                    :key="`${song.id}-${index}`"
                    class="song-item"
                  >
                    <div class="song-number">{{ String(index + 1).padStart(2, '0') }}</div>
                    <img v-if="song.albumCover" :src="song.albumCover" :alt="song.album" class="song-artwork">
                    <div class="song-details">
                      <div class="song-item-title">{{ song.title }}</div>
                      <div class="song-item-artist">{{ song.artist }} · {{ formatTime(song.duration) }}</div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
    <HomeFooter />
  </div>
</template>
