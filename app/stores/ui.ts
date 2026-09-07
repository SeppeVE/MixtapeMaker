import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

/** Global UI state: toast notifications + the auth & feedback modals. */
export const useUiStore = defineStore('ui', () => {
  const toast = ref<{ message: string; type: ToastType } | null>(null);
  const isAuthModalOpen = ref(false);
  const isFeedbackModalOpen = ref(false);

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
  function openFeedback() {
    isFeedbackModalOpen.value = true;
  }
  function closeFeedback() {
    isFeedbackModalOpen.value = false;
  }

  return {
    toast,
    isAuthModalOpen,
    isFeedbackModalOpen,
    showToast,
    clearToast,
    openAuth,
    closeAuth,
    openFeedback,
    closeFeedback,
  };
});
