<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { Mixtape, Profile, JCard } from '~/types';
import { useCopyToLibrary } from '~/composables/useCopyToLibrary';
import IconCassette from '~icons/ph/cassette-tape';
import IconCard from '~icons/material-symbols/devices-fold-2-sharp';

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

const router = useRouter();

function goBack() {
  if (window.history.state?.back) {
    router.back();
  } else {
    router.push('/explore');
  }
}

// Signed out this parks the copy and opens the auth modal; the auth plugin
// replays it once a session lands, wherever the login flow drops the user.
// The whole tape rides along in the parked action — this view also serves
// share links, whose tapes aren't public and couldn't be re-read by id.
const { requestCopyMixtape } = useCopyToLibrary();

function handleCopy() {
  if (props.mixtape) requestCopyMixtape(props.mixtape);
}
</script>

<template>
  <div class="lib-page">
    <NavBar library>
      <button v-if="showBack" class="lp-nav-link" @click="goBack">◀ Back</button>
      <NuxtLink v-else to="/" class="lp-nav-link">◀ Home</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span class="lp-nav-current">{{ breadcrumbLabel }}</span>
    </NavBar>

    <div class="lib-content">
      <p v-if="loading" class="lib-page-loading">Loading…</p>

      <div v-else-if="notFound" class="lib-empty">
        <IconCassette class="lib-empty-icon" aria-hidden="true" />
        <p>This mixtape isn't available.</p>
        <p class="lib-empty-sub">{{ notFoundSub }}</p>
      </div>

      <div v-else-if="mixtape" class="lib-section-stack">
        <section class="lib-section">
          <div class="lib-section-head">
            <span>{{ mixtape.title }}</span>
            <button class="lp-btn lp-btn-forest" @click="handleCopy">⎘ Copy to my library</button>
          </div>
          <p v-if="mixtape.dedicatedTo" class="mxd-dedication">For {{ mixtape.dedicatedTo }}</p>
          <p v-if="author" class="mxd-author">
            <AuthorByline :profile="author" prefix="Made by" />
          </p>

          <div class="mxd-cassette">
            <CassetteSVG :title="mixtape.title" side="A" :float="false" />
          </div>

          <div class="mxd-export">
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
                <span class="mxd-jcard-label"><IconCard class="icon-inline" aria-hidden="true" /> {{ card.title || 'Untitled J-Card' }}</span>
                <NuxtLink :to="`/jcard/${card.id}`" class="pf-inline-link mxd-jcard-link">Open ↗</NuxtLink>
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

<style scoped>
/* The page borrows the library shell (.lib-page / .lib-content) and
   Profile.css's .detail-jcards / .pf-inline-link — those stay global. */
.mxd-dedication {
  margin-bottom: 16px;
  font-style: italic;
}

.mxd-author {
  margin-bottom: 16px;
}

.mxd-cassette {
  max-width: 320px;
  margin-bottom: 24px;
}

.mxd-export {
  margin-bottom: 24px;
  width: max-content;
}

/* J-card entries listed under the tape. */
.mxd-jcard-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.mxd-jcard-link {
  font-family: var(--font-body);
  font-size: 12px;
}
</style>
