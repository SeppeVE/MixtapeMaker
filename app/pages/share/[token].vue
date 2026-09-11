<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData, useSeoMeta, useRequestEvent, setResponseStatus } from '#app';
import { loadSharedMixtape } from '~/utils/database';

const route = useRoute();
const token = computed(() => route.params.token as string);

const { data: mixtape, pending } = await useAsyncData(
  () => `shared-mixtape-${token.value}`,
  () => loadSharedMixtape(token.value),
);

const notFound = computed(() => !pending.value && !mixtape.value);

useSeoMeta({
  title: () => (mixtape.value ? `${mixtape.value.title} — Mixtape Maker` : 'Shared Mixtape — Mixtape Maker'),
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
    breadcrumb-label="Shared"
    not-found-sub="This link may have been revoked or never existed."
  />
</template>
