import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

/** Global UI state: toast notifications + the auth modal. */
export const useUiStore = defineStore('ui', () => {
  const toast = ref<{ message: string; type: ToastType } | null>(null);
  const isAuthModalOpen = ref(false);

  function showToast(message: string, type: ToastType) {
    toast.value = { message, type };
  }
  function clearToast() {
    toast.value = null;
  }
  function openAuth() {
    isAuthModalOpen.value = true;
  }
  function closeAuth() {
    isAuthModalOpen.value = false;
  }

  return { toast, isAuthModalOpen, showToast, clearToast, openAuth, closeAuth };
});
