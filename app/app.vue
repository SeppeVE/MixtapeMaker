<script setup lang="ts">
import '~/assets/styles/App.css';

const { isAuthModalOpen, toast } = useAppMixtapeState();
</script>

<template>
  <NuxtPage />

  <AuthModal :is-open="isAuthModalOpen" :on-close="() => (isAuthModalOpen = false)" />
  <Toast
    v-if="toast"
    :message="toast.message"
    :type="toast.type"
    :on-close="() => (toast = null)"
  />
</template>
