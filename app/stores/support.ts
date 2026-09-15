import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';
import {
  EMPTY_SUPPORT_STATE,
  evaluateSupportBlock,
  mergeSupportState,
  readLocalSupportState,
  supportStateEquals,
  writeLocalSupportState,
  type SupportPromptState,
} from '~/utils/supportPrompt';
import { loadSupportPrefs, saveSupportPrefs } from '~/utils/supportDatabase';

/**
 * Suppression state for the "Buy me a coffee" block and the print checklist.
 *
 * Source of truth is this store's `state`. It is always mirrored to
 * localStorage, and for signed-in users also to their `profiles` row so a
 * "Don't show this again" follows them across devices. Supabase failures
 * (no table yet, offline) degrade silently to localStorage-only behaviour.
 */
export const useSupportStore = defineStore('support', () => {
  const auth = useAuthStore();

  const state = ref<SupportPromptState>(
    import.meta.client ? readLocalSupportState() : { ...EMPTY_SUPPORT_STATE },
  );

  // User id whose profile row `state` has been reconciled with, if any.
  let syncedUserId: string | null = null;

  function persist(next: SupportPromptState) {
    state.value = next;
    writeLocalSupportState(next);
    const userId = auth.user?.id;
    if (userId && syncedUserId === userId) {
      saveSupportPrefs(userId, next).catch((err) => {
        console.debug('support prefs: cloud write skipped', err);
      });
    }
  }

  /**
   * On sign-in, reconcile local state with the profile row: neither side can
   * lose a suppression (opt-outs OR together, timestamps take the latest), and
   * the merged result is written back wherever it differs.
   */
  async function syncWithProfile(userId: string) {
    try {
      const remote = await loadSupportPrefs(userId);
      const merged = remote ? mergeSupportState(state.value, remote) : state.value;
      state.value = merged;
      writeLocalSupportState(merged);
      syncedUserId = userId;
      if (!remote || !supportStateEquals(remote, merged)) {
        await saveSupportPrefs(userId, merged);
      }
    } catch (err) {
      // Table missing / RLS / offline: stay on localStorage for this session.
      console.debug('support prefs: cloud sync unavailable', err);
      syncedUserId = null;
    }
  }

  if (import.meta.client) {
    watch(
      () => auth.user?.id ?? null,
      (userId) => {
        if (userId) {
          if (userId !== syncedUserId) syncWithProfile(userId);
        } else {
          syncedUserId = null;
        }
      },
      { immediate: true },
    );
  }

  const printChecklistMuted = computed(() => state.value.printChecklistOptOut);

  function shouldShowSupportBlock(): boolean {
    return evaluateSupportBlock(state.value);
  }

  function markSupportBlockShown() {
    persist({ ...state.value, supportPromptLastShownAt: new Date().toISOString() });
  }

  function optOutOfSupportBlock() {
    persist({ ...state.value, supportPromptOptOut: true });
  }

  function markSupportBlockClicked() {
    persist({ ...state.value, supportPromptClickedAt: new Date().toISOString() });
  }

  function optOutOfPrintChecklist() {
    persist({ ...state.value, printChecklistOptOut: true });
  }

  return {
    state,
    printChecklistMuted,
    shouldShowSupportBlock,
    markSupportBlockShown,
    optOutOfSupportBlock,
    markSupportBlockClicked,
    optOutOfPrintChecklist,
  };
});
