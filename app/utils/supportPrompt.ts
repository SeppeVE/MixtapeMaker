// ── "Buy me a coffee" support prompt: rules + local persistence ──────────────
//
// The coffee block rides inside a success modal (Spotify export, share link,
// J-card PDF). It never opens a modal of its own, and it is rate-limited
// separately from the modal it sits in — the modal stays useful and can keep
// appearing; only the ask is capped.
//
// Rules, in order (see shouldShowSupportBlock):
//   1. opted out ("Don't show this again")        → never
//   2. clicked the coffee link < 180 days ago     → don't re-ask a donor
//   3. block shown < 30 days ago                  → cooldown
//   4. otherwise                                  → show, then mark shown
//
// Signed-out users keep this state in localStorage; signed-in users get it
// mirrored onto their `profiles` row (see supportDatabase.ts / stores/support.ts)
// so suppression follows them across devices.

export const SUPPORT_URL = 'https://www.buymeacoffee.com/seppe.ve';

export const SUPPORT_SHOW_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
export const SUPPORT_CLICK_COOLDOWN_MS = 180 * 24 * 60 * 60 * 1000;

/** Which success modal the coffee block appeared in. */
export type SupportTrigger = 'spotify' | 'share' | 'pdf';

/** Where a coffee link was clicked. The passive placements report here too. */
export type SupportClickSource = SupportTrigger | 'footer' | 'library';

export interface SupportPromptState {
  /** ISO timestamp of the last time the coffee block was displayed. */
  supportPromptLastShownAt: string | null;
  /** "Don't show this again" on the coffee block. */
  supportPromptOptOut: boolean;
  /** ISO timestamp of the last click on the coffee link from a modal. */
  supportPromptClickedAt: string | null;
  /** Separate mute for the print checklist in the PDF modal. */
  printChecklistOptOut: boolean;
}

export const EMPTY_SUPPORT_STATE: SupportPromptState = {
  supportPromptLastShownAt: null,
  supportPromptOptOut: false,
  supportPromptClickedAt: null,
  printChecklistOptOut: false,
};

// localStorage keys — one per field, so each is trivially inspectable in devtools.
const KEYS: Record<keyof SupportPromptState, string> = {
  supportPromptLastShownAt: 'supportPromptLastShownAt',
  supportPromptOptOut: 'supportPromptOptOut',
  supportPromptClickedAt: 'supportPromptClickedAt',
  printChecklistOptOut: 'printChecklistOptOut',
};

const isClient = typeof window !== 'undefined';

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function withinMs(iso: string | null, windowMs: number, now: number): boolean {
  const at = parseTimestamp(iso);
  return at !== null && now - at < windowMs;
}

/** Pure rule evaluation, so it can be reasoned about (and tested) without storage. */
export function evaluateSupportBlock(state: SupportPromptState, now: number = Date.now()): boolean {
  if (state.supportPromptOptOut) return false;
  if (withinMs(state.supportPromptClickedAt, SUPPORT_CLICK_COOLDOWN_MS, now)) return false;
  if (withinMs(state.supportPromptLastShownAt, SUPPORT_SHOW_COOLDOWN_MS, now)) return false;
  return true;
}

/**
 * Combine two copies of the state (e.g. localStorage vs. the user's profile row)
 * without ever losing a suppression: opt-outs OR together, timestamps take the
 * most recent. Used when a signed-out user signs in, or a signed-in user lands
 * on a new device.
 */
export function mergeSupportState(a: SupportPromptState, b: SupportPromptState): SupportPromptState {
  const later = (x: string | null, y: string | null): string | null => {
    const xm = parseTimestamp(x);
    const ym = parseTimestamp(y);
    if (xm === null) return ym === null ? null : y;
    if (ym === null) return x;
    return xm >= ym ? x : y;
  };
  return {
    supportPromptLastShownAt: later(a.supportPromptLastShownAt, b.supportPromptLastShownAt),
    supportPromptOptOut: a.supportPromptOptOut || b.supportPromptOptOut,
    supportPromptClickedAt: later(a.supportPromptClickedAt, b.supportPromptClickedAt),
    printChecklistOptOut: a.printChecklistOptOut || b.printChecklistOptOut,
  };
}

export function supportStateEquals(a: SupportPromptState, b: SupportPromptState): boolean {
  return (
    a.supportPromptLastShownAt === b.supportPromptLastShownAt &&
    a.supportPromptOptOut === b.supportPromptOptOut &&
    a.supportPromptClickedAt === b.supportPromptClickedAt &&
    a.printChecklistOptOut === b.printChecklistOptOut
  );
}

// ── localStorage ─────────────────────────────────────────────────────────────

export function readLocalSupportState(): SupportPromptState {
  if (!isClient) return { ...EMPTY_SUPPORT_STATE };
  try {
    return {
      supportPromptLastShownAt: localStorage.getItem(KEYS.supportPromptLastShownAt),
      supportPromptOptOut: localStorage.getItem(KEYS.supportPromptOptOut) === 'true',
      supportPromptClickedAt: localStorage.getItem(KEYS.supportPromptClickedAt),
      printChecklistOptOut: localStorage.getItem(KEYS.printChecklistOptOut) === 'true',
    };
  } catch {
    // Private mode / blocked storage: behave as a first-time visitor.
    return { ...EMPTY_SUPPORT_STATE };
  }
}

export function writeLocalSupportState(state: SupportPromptState): void {
  if (!isClient) return;
  try {
    const setOrClear = (key: string, value: string | null) => {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    };
    setOrClear(KEYS.supportPromptLastShownAt, state.supportPromptLastShownAt);
    setOrClear(KEYS.supportPromptOptOut, state.supportPromptOptOut ? 'true' : null);
    setOrClear(KEYS.supportPromptClickedAt, state.supportPromptClickedAt);
    setOrClear(KEYS.printChecklistOptOut, state.printChecklistOptOut ? 'true' : null);
  } catch {
    // Storage unavailable — the in-memory copy in the store still applies for this session.
  }
}

// ── Convenience API (localStorage-backed) ────────────────────────────────────
//
// The Pinia store (stores/support.ts) is the source of truth inside the app
// because it also syncs to Supabase for signed-in users. These plain helpers
// exist for code that runs outside a component/store context.

export function shouldShowSupportBlock(now: number = Date.now()): boolean {
  return evaluateSupportBlock(readLocalSupportState(), now);
}

export function markSupportBlockShown(now: number = Date.now()): void {
  writeLocalSupportState({ ...readLocalSupportState(), supportPromptLastShownAt: new Date(now).toISOString() });
}

export function optOutOfSupportBlock(): void {
  writeLocalSupportState({ ...readLocalSupportState(), supportPromptOptOut: true });
}

export function markSupportBlockClicked(now: number = Date.now()): void {
  writeLocalSupportState({ ...readLocalSupportState(), supportPromptClickedAt: new Date(now).toISOString() });
}

export function optOutOfPrintChecklist(): void {
  writeLocalSupportState({ ...readLocalSupportState(), printChecklistOptOut: true });
}
