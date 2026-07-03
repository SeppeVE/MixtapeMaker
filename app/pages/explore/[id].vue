<script setup lang="ts">
import { loadPublicMixtape } from '~/utils/database';

const route = useRoute();
const id = computed(() => route.params.id as string | undefined);
</script>

<template>
  <MixtapeDetailView
    :loader="loadPublicMixtape"
    :route-key="id"
    breadcrumb-label="Explore"
    not-found-sub="It may be private or no longer exist."
  />
</template>
