<script setup lang="ts">
// Switches between the two how-to guides. Sits at the top of each guide's
// header; the current guide is highlighted via the exact-active link class.
const GUIDES = [
  { to: '/how-to/editor-and-designer', label: 'Using Mixtape Maker' },
  { to: '/how-to', label: 'Recording to cassette' },
];
</script>

<template>
  <nav class="gd-guides" aria-label="Guides">
    <NuxtLink
      v-for="g in GUIDES"
      :key="g.to"
      :to="g.to"
      class="gd-guide-link"
      exact-active-class="gd-guide-link--active"
    >
      {{ g.label }}
    </NuxtLink>
  </nav>
</template>
