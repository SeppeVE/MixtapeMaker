import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useSupportStore } from '~/stores/support';
import { trackEvent } from '~/utils/analytics';
import type { SupportTrigger } from '~/utils/supportPrompt';

export type ToastType = 'success' | 'error' | 'info';

export interface SuccessModalLink {
  url: string;
  /** Label of the primary "open" button, e.g. "Open in Spotify". */
  openLabel: string;
}

export interface SuccessModalChecklist {
  heading: string;
  items: string[];
}

/** What a caller passes to openSuccessModal(). */
export interface SuccessModalOptions {
  /** Shown in the title bar after the check mark, e.g. "Playlist created". */
  title: string;
  /** Which flow this is — used to attribute the coffee block in analytics. */
  trigger: SupportTrigger;
  /** Share / playlist link with open + copy buttons. */
  link?: SuccessModalLink;
  /** Several links (e.g. one per exported side), each with its own open + copy button. */
  links?: SuccessModalLink[];
  /** True when the caller already put the link on the clipboard. */
  copied?: boolean;
  /** One-line note under the title, e.g. "3 added · 1 skipped". */
  note?: string;
  /** Facts about what was just made (runtime, artists…). Never generated praise. */
  facts?: string[];
  /** Muteable checklist (the PDF print checklist). */
  checklist?: SuccessModalChecklist;
  /** Toast shown instead when nothing in the modal is worth an interruption. */
  fallbackToast?: string;
}

export interface SuccessModalState extends SuccessModalOptions {
  showSupport: boolean;
  showChecklist: boolean;
}

/** Global UI state: toast notifications + the auth, feedback & success modals. */
export const useUiStore = defineStore('ui', () => {
  const toast = ref<{ message: string; type: ToastType } | null>(null);
  const isAuthModalOpen = ref(false);
  const isFeedbackModalOpen = ref(false);
  const successModal = ref<SuccessModalState | null>(null);

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

  function successModalHasContent(m: SuccessModalState): boolean {
    return !!m.link || !!m.links?.length || m.showChecklist || !!m.facts?.length;
  }

  /**
   * Open a success confirmation after an action has already completed. The
   * coffee block is appended only when the suppression rules allow it, and is
   * marked as shown right here so a re-render can never double-count it. When
   * neither the modal's own content nor the coffee block should appear, the
   * caller's fallback toast is shown instead. Returns whether the modal opened.
   */
  function openSuccessModal(opts: SuccessModalOptions): boolean {
    const support = useSupportStore();
    const showChecklist = !!opts.checklist && !support.printChecklistMuted;
    const showSupport = support.shouldShowSupportBlock();
    const next: SuccessModalState = { ...opts, showSupport, showChecklist };

    if (!successModalHasContent(next) && !showSupport) {
      if (opts.fallbackToast) showToast(opts.fallbackToast, 'success');
      return false;
    }

    if (showSupport) {
      support.markSupportBlockShown();
      trackEvent('support_block_shown', { trigger: opts.trigger });
    }
    successModal.value = next;
    return true;
  }

  function closeSuccessModal() {
    successModal.value = null;
  }

  /** Hide the coffee block in the open modal (after an opt-out). Closes the modal if it is now empty. */
  function hideSupportBlock() {
    if (!successModal.value) return;
    const next = { ...successModal.value, showSupport: false };
    if (!successModalHasContent(next)) closeSuccessModal();
    else successModal.value = next;
  }

  /** Hide the checklist in the open modal (after an opt-out). Closes the modal if it is now empty. */
  function hideChecklist() {
    if (!successModal.value) return;
    const next = { ...successModal.value, showChecklist: false };
    if (!successModalHasContent(next) && !next.showSupport) closeSuccessModal();
    else successModal.value = next;
  }

  return {
    toast,
    isAuthModalOpen,
    isFeedbackModalOpen,
    successModal,
    showToast,
    clearToast,
    openAuth,
    closeAuth,
    openFeedback,
    closeFeedback,
    openSuccessModal,
    closeSuccessModal,
    hideSupportBlock,
    hideChecklist,
  };
});
