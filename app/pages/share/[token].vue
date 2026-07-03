<script setup lang="ts">
import { loadSharedMixtape } from '~/utils/database';

const route = useRoute();
const token = computed(() => route.params.token as string | undefined);
</script>

<template>
  <MixtapeDetailView
    :loader="loadSharedMixtape"
    :route-key="token"
    breadcrumb-label="Shared"
    not-found-sub="This link may have been revoked or never existed."
  />
</template>
