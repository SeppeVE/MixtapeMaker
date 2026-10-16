<script setup lang="ts">
import { computed } from 'vue';
import { useHead, useSeoMeta } from '#app';

// Self-referencing canonical + og:url for every page, built from the path only
// so query strings (?tab=jcards, pagination) don't create duplicate URLs.
const SITE_URL = 'https://mixtape-maker.com';
const route = useRoute();
const pageUrl = computed(() => (route.path === '/' ? SITE_URL : `${SITE_URL}${route.path.replace(/\/+$/, '')}`));

useHead({ link: [{ rel: 'canonical', href: pageUrl }] });
useSeoMeta({ ogUrl: pageUrl });
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
