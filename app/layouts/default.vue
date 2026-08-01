<script setup lang="ts">
import { useUiStore } from '~/stores/ui';

const ui = useUiStore();
</script>

<template>
  <div class="app-root">
    <slot />

    <AuthModal />
    <Toast
      v-if="ui.toast"
      :message="ui.toast.message"
      :type="ui.toast.type"
      @close="ui.clearToast()"
    />
  </div>
</template>
