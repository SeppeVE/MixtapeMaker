import { ref } from 'vue';
import type { Mixtape } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { useMixtapeStore } from '~/stores/mixtape';
import { generateId } from '~/utils/timeUtils';
import { copyPublicJCard, JCardCopyError } from '~/utils/jcardDatabase';
import { savePendingAction, loadPendingAction, clearPendingAction } from '~/utils/pendingAction';

const AUTH_CONTEXT = 'Log in or sign up to copy this to your library';

/** A copy of `source` as a fresh private draft, owned by nobody until it's saved. */
function buildMixtapeCopy(source: Mixtape): Mixtape {
  const now = new Date().toISOString();
  return {
    ...source,
    id: generateId(),
    userId: undefined,
    isPublic: false,
    shareToken: null,
    isCopy: true,
    createdAt: now,
    updatedAt: now,
  };
}

// ── The copies themselves, without the auth gate ────────────────────────────
// Both leave the user in the matching editor with the copy open.

async function copyJCard(sourceId: string, userId: string): Promise<void> {
  const copy = await copyPublicJCard(sourceId, userId);
  // Sets the designer's active card and navigates to it.
  useMixtapeStore().openDesigner(copy);
  useUiStore().showToast('Copied to your library — yours to edit now', 'success');
}

function copyMixtape(source: Mixtape): void {
  const ui = useUiStore();
  // Navigates to the editor and toasts; our message replaces its generic one.
  useMixtapeStore().loadMixtape(buildMixtapeCopy(source));
  ui.showToast('Copied to your mixtape — personalize and save it', 'success');
}

function failureMessage(e: unknown): string {
  if (e instanceof JCardCopyError) return 'That J-card is no longer available to copy';
  return 'Could not copy that — open it and try again';
}

/**
 * "Copy to my library", gated on being signed in.
 *
 * Signed out, the request is parked in localStorage and replayed by the auth
 * plugin once a session appears. That's the only thing that survives Google's
 * full-page OAuth redirect, which returns to the site root rather than to the
 * page the button was on — and it covers the email flows for free.
 */
export function useCopyToLibrary() {
  const auth = useAuthStore();
  const ui = useUiStore();
  const copying = ref(false);

  async function requestCopyJCard(sourceId: string): Promise<void> {
    if (!auth.user) {
      savePendingAction({ kind: 'copy-jcard', id: sourceId, createdAt: Date.now() });
      ui.openAuth(AUTH_CONTEXT);
      return;
    }
    if (copying.value) return;
    copying.value = true;
    try {
      await copyJCard(sourceId, auth.user.id);
    } catch (e) {
      console.error('Copy failed:', e);
      ui.showToast(failureMessage(e), 'error');
    } finally {
      copying.value = false;
    }
  }

  function requestCopyMixtape(source: Mixtape): void {
    if (!auth.user) {
      savePendingAction({ kind: 'copy-mixtape', mixtape: source, createdAt: Date.now() });
      ui.openAuth(AUTH_CONTEXT);
      return;
    }
    copyMixtape(source);
  }

  return { copying, requestCopyJCard, requestCopyMixtape };
}

/**
 * Replay a copy parked before signing in. The action is cleared before it runs,
 * never after: a resume that fails once is better than one that fires again on
 * every reload, so the failure toast tells the user to open the card and retry.
 */
export async function resumePendingCopy(userId: string): Promise<void> {
  const action = loadPendingAction();
  if (!action) return;
  clearPendingAction();
  try {
    if (action.kind === 'copy-jcard') {
      // Duplicating the images takes a moment, and the login flow has just
      // dropped the user somewhere unrelated — say what's happening first.
      useUiStore().showToast('Finishing your copy…', 'info');
      await copyJCard(action.id, userId);
    } else {
      copyMixtape(action.mixtape);
    }
  } catch (e) {
    console.error('Pending copy failed:', e);
    useUiStore().showToast(failureMessage(e), 'error');
  }
}
