<script setup lang="ts">
import IconEye from '~icons/mdi/eye';
import IconEyeOff from '~icons/mdi/eye-off';

// Action icon: public → hide (eye-off), private → show (eye).
defineProps<{ isPublic: boolean }>();
</script>

<template>
  <component
    :is="isPublic ? IconEyeOff : IconEye"
    class="visibility-toggle-icon"
    aria-hidden="true"
  />
</template>
