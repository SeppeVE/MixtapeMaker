<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData, useSeoMeta, useRequestEvent, setResponseStatus } from '#app';
import { loadPublicMixtape } from '~/utils/database';
import type { Profile, JCard } from '~/types';
import { loadProfilesByIds } from '~/utils/profileDatabase';
import { listPublicJCardsForMixtape } from '~/utils/jcardDatabase';

const route = useRoute();
const id = computed(() => route.params.id as string);

// Author byline + any public J-cards designed for this tape. Both are
// best-effort extras: a failure leaves the mixtape page intact.
async function loadExtras(m: { id: string; userId?: string } | null): Promise<{ author: Profile | null; jcards: JCard[] }> {
  if (!m) return { author: null, jcards: [] };
  const [author, jcards] = await Promise.all([
    m.userId ? loadProfilesByIds([m.userId]).then((map) => map.get(m.userId!) ?? null).catch(() => null) : Promise.resolve(null),
    listPublicJCardsForMixtape(m.id).catch(() => [] as JCard[]),
  ]);
  return { author, jcards };
}

const { data, pending } = await useAsyncData(
  () => `public-mixtape-${id.value}`,
  async () => {
    const mixtape = await loadPublicMixtape(id.value);
    return { mixtape, ...(await loadExtras(mixtape)) };
  },
);
const mixtape = computed(() => data.value?.mixtape ?? null);

const notFound = computed(() => !pending.value && !mixtape.value);

useSeoMeta({
  title: () => (mixtape.value ? `${mixtape.value.title} — Mixtape Maker` : 'Mixtape — Mixtape Maker'),
  description: () =>
    mixtape.value
      ? `A public cassette mixtape: ${mixtape.value.sideA.length + mixtape.value.sideB.length} tracks across Side A & B.`
      : 'A public cassette mixtape on Mixtape Maker.',
  ogTitle: () => (mixtape.value ? mixtape.value.title : 'Mixtape Maker'),
  robots: 'noindex, follow',
});

if (import.meta.server && notFound.value) {
  setResponseStatus(useRequestEvent(), 404);
}
</script>

<template>
  <MixtapeDetailView
    :mixtape="mixtape"
    :loading="pending"
    :not-found="notFound"
    :author="data?.author ?? null"
    :jcards="data?.jcards ?? []"
    breadcrumb-label="Explore"
    not-found-sub="It may be private or no longer exist."
    show-back
  />
</template>
