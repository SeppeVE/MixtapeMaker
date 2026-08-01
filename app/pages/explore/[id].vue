<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData, useSeoMeta, useRequestEvent, setResponseStatus } from '#app';
import { loadPublicMixtape } from '~/utils/database';

const route = useRoute();
const id = computed(() => route.params.id as string);

const { data: mixtape, pending } = await useAsyncData(
  () => `public-mixtape-${id.value}`,
  () => loadPublicMixtape(id.value),
);

const notFound = computed(() => !pending.value && !mixtape.value);

useSeoMeta({
  title: () => (mixtape.value ? `${mixtape.value.title} — Mixtape Maker` : 'Mixtape — Mixtape Maker'),
  description: () =>
    mixtape.value
      ? `A public cassette mixtape: ${mixtape.value.sideA.length + mixtape.value.sideB.length} tracks across Side A & B.`
      : 'A public cassette mixtape on Mixtape Maker.',
  ogTitle: () => (mixtape.value ? mixtape.value.title : 'Mixtape Maker'),
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
    breadcrumb-label="Explore"
    not-found-sub="It may be private or no longer exist."
    show-back
  />
</template>
