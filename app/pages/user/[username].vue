<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData, useSeoMeta, useRequestEvent, setResponseStatus } from '#app';
import type { Mixtape, JCard } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { loadProfileByUsername } from '~/utils/profileDatabase';
import { loadPublicMixtapesByUser } from '~/utils/database';
import { listPublicJCardsByUser } from '~/utils/jcardDatabase';
import { formatDuration } from '~/utils/timeUtils';
import IconCassette from '~icons/ph/cassette-tape';
import IconCard from '~icons/material-symbols/devices-fold-2-sharp';
import IconPencil from '~icons/material-symbols/edit-sharp';
import IconLock from '~icons/material-symbols/lock-rounded';
import IconSmiley from '~icons/material-symbols/sentiment-satisfied-rounded';

const route = useRoute();
const auth = useAuthStore();
const username = computed(() => String(route.params.username ?? '').toLowerCase());

const { data, pending } = await useAsyncData(
  () => `profile-${username.value}`,
  async () => {
    const profile = await loadProfileByUsername(username.value);
    if (!profile) return { profile: null, mixtapes: [] as Mixtape[], jcards: [] as JCard[] };
    if (profile.isPrivate) return { profile, mixtapes: [] as Mixtape[], jcards: [] as JCard[] };
    const [mixtapes, jcards] = await Promise.all([
      loadPublicMixtapesByUser(profile.id),
      listPublicJCardsByUser(profile.id),
    ]);
    return { profile, mixtapes, jcards };
  },
);

const profile = computed(() => data.value?.profile ?? null);
const notFound = computed(() => !pending.value && !profile.value);
const isOwner = computed(() => !!auth.user && !!profile.value && auth.user.id === profile.value.id);

// A private profile is rendered as a placeholder for everyone but its owner,
// who gets their own public items loaded client-side once auth resolves.
const ownItems = ref<{ mixtapes: Mixtape[]; jcards: JCard[] } | null>(null);
watch(
  () => [isOwner.value, profile.value?.isPrivate] as const,
  async ([owner, isPrivate]) => {
    if (!owner || !isPrivate || !profile.value) {
      ownItems.value = null;
      return;
    }
    try {
      const [mixtapes, jcards] = await Promise.all([
        loadPublicMixtapesByUser(profile.value.id),
        listPublicJCardsByUser(profile.value.id),
      ]);
      ownItems.value = { mixtapes, jcards };
    } catch { /* leave the placeholder */ }
  },
  { immediate: true },
);

const showContent = computed(() => !!profile.value && (!profile.value.isPrivate || (isOwner.value && !!ownItems.value)));
const mixtapes = computed(() => ownItems.value?.mixtapes ?? data.value?.mixtapes ?? []);
const jcards = computed(() => ownItems.value?.jcards ?? data.value?.jcards ?? []);

useSeoMeta({
  title: () => (profile.value ? `@${profile.value.username} — Mixtape Maker` : 'Profile — Mixtape Maker'),
  description: () =>
    profile.value && !profile.value.isPrivate
      ? `Mixtapes and J-cards by @${profile.value.username} on Mixtape Maker.`
      : 'A Mixtape Maker profile.',
  robots: 'noindex, follow',
});

if (import.meta.server && notFound.value) {
  setResponseStatus(useRequestEvent(), 404);
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const totalDuration = (m: Mixtape) => [...m.sideA, ...m.sideB].reduce((s, t) => s + t.duration, 0);
const initial = computed(() => (profile.value?.username ?? '?').slice(0, 1).toUpperCase());
</script>

<template>
  <div class="lib-page">
    <div class="lib-screen">
      <NavBar library>
        <NuxtLink to="/explore" class="lp-nav-link">◀ Explore</NuxtLink>
        <span class="lp-nav-sep">/</span>
        <span class="lp-nav-current">Profile</span>
      </NavBar>

      <div class="lib-content">
      <p v-if="pending" class="lib-page-loading">Loading…</p>

      <div v-else-if="notFound" class="lib-empty">
        <IconSmiley class="lib-empty-icon" aria-hidden="true" />
        <p>No user named @{{ username }}.</p>
        <p class="lib-empty-sub">They may have changed their username.</p>
      </div>

      <div v-else-if="profile" class="lib-section-stack">
        <!-- Header card -->
        <section class="lib-section pf-header">
          <div class="pf-avatar pf-avatar--lg">
            <img v-if="profile.avatarUrl && (!profile.isPrivate || isOwner)" :src="profile.avatarUrl" alt="" >
            <span v-else>{{ initial }}</span>
          </div>
          <div class="pf-header-text">
            <h1 class="pf-username">@{{ profile.username }}</h1>
            <p class="pf-hint">Joined {{ fmtDate(profile.createdAt) }}</p>
            <p v-if="profile.bio && (!profile.isPrivate || isOwner)" class="pf-bio">{{ profile.bio }}</p>
            <div v-if="isOwner" class="pf-owner-row">
              <span v-if="profile.isPrivate" class="lib-badge lib-badge-private">◌ Private — only you see this</span>
              <NuxtLink to="/profile" class="lp-btn lp-btn-paper" style="font-size:15px"><IconPencil class="icon-inline" aria-hidden="true" /> Edit profile</NuxtLink>
            </div>
          </div>
        </section>

        <!-- Private placeholder -->
        <div v-if="profile.isPrivate && !showContent" class="lib-empty">
          <IconLock class="lib-empty-icon" aria-hidden="true" />
          <p>This user has set their profile to private.</p>
        </div>

        <template v-else-if="showContent">
          <!-- Mixtapes -->
          <section class="lib-section">
            <div class="lib-section-head">
              <span>Public Mixtapes</span>
              <span class="lib-section-sub">{{ mixtapes.length }} tape{{ mixtapes.length === 1 ? '' : 's' }}</span>
            </div>
            <div v-if="mixtapes.length === 0" class="lib-empty">
              <IconCassette class="lib-empty-icon" aria-hidden="true" />
              <p>No public mixtapes yet.</p>
            </div>
            <div v-else class="lib-cards-grid">
              <NuxtLink v-for="tape in mixtapes" :key="tape.id" :to="`/explore/${tape.id}`" class="lib-tape-card">
                <div class="lib-tape-card-header">
                  <span class="lib-tape-card-title">{{ tape.title }}</span>
                </div>
                <div class="lib-tape-card-body">
                  <div class="lib-tape-row">
                    <span class="lib-tape-label">Side A</span>
                    <span class="lib-tape-value">{{ tape.sideA.length }} tracks</span>
                  </div>
                  <div class="lib-tape-row">
                    <span class="lib-tape-label">Side B</span>
                    <span class="lib-tape-value">{{ tape.sideB.length }} tracks</span>
                  </div>
                  <div class="lib-tape-row">
                    <span class="lib-tape-label">Total</span>
                    <span class="lib-tape-value">{{ formatDuration(totalDuration(tape)) }}</span>
                  </div>
                </div>
                <div class="lib-tape-card-footer">
                  <span class="lib-tape-length">C-{{ tape.cassetteLength }}</span>
                  <span class="lib-tape-date">{{ fmtDate(tape.updatedAt) }}</span>
                </div>
              </NuxtLink>
            </div>
          </section>

          <!-- J-cards -->
          <section class="lib-section">
            <div class="lib-section-head">
              <span>Public J-Cards</span>
              <span class="lib-section-sub">{{ jcards.length }} card{{ jcards.length === 1 ? '' : 's' }}</span>
            </div>
            <div v-if="jcards.length === 0" class="lib-empty">
              <IconCard class="lib-empty-icon" aria-hidden="true" />
              <p>No public J-cards yet.</p>
            </div>
            <div v-else class="jcard-library-grid">
              <NuxtLink v-for="card in jcards" :key="card.id" :to="`/jcard/${card.id}`" class="jcard-card">
                <div class="jcard-card-swatch" :style="{ backgroundColor: card.content.backgroundColor }" />
                <div class="jcard-card-info">
                  <p class="jcard-card-name">{{ card.title || 'Untitled' }}</p>
                  <p class="jcard-card-meta">
                    {{ card.content.flaps }} flap{{ card.content.flaps !== 1 ? 's' : '' }} · {{ fmtDate(card.updatedAt) }}
                  </p>
                </div>
              </NuxtLink>
            </div>
          </section>
        </template>
      </div>
      </div>
      <HomeFooterMain />
    </div>
    <HomeFooterRail />
  </div>
</template>
