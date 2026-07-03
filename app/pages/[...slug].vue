<script setup lang="ts">
// Unknown routes fall back to the homepage, matching the old
// react-router `<Route path="*" element={<Navigate to="/" replace />} />`.
await navigateTo('/', { replace: true });
</script>

<template>
  <div />
</template>
