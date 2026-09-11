import { supabase } from './supabase';

// Keep in sync with the CHECK constraint on feedback.message in SUPABASE_SETUP.md.
export const FEEDBACK_MESSAGE_MAX_LENGTH = 2000;

// Keep in sync with the feedback_rate_limit_ok() window in SUPABASE_SETUP.md.
// Client-side cooldown for anonymous submitters is enforced in FeedbackModal
// (localStorage, not a real security boundary); this is the DB-enforced
// value for signed-in users.
export const FEEDBACK_COOLDOWN_MS = 10 * 60 * 1000;

// Postgres error code for an RLS WITH CHECK violation. The only way a
// legitimate submission through this UI hits it is the per-user rate limit
// (we always send the caller's own auth.uid()), so callers can treat it as
// "you're submitting too fast" rather than a generic failure.
export function isRateLimitError(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error && error.code === '42501';
}

// Submit a piece of user feedback / feature request. Anonymous by default —
// email and userId are only attached when known (signed-in user, or an
// email the user chose to leave), so the RLS insert policy can stay wide
// open without ever requiring auth.
export async function submitFeedback(
  message: string,
  email: string | null,
  userId: string | null
): Promise<void> {
  const { error } = await supabase.from('feedback').insert({
    message: message.slice(0, FEEDBACK_MESSAGE_MAX_LENGTH),
    email: email || null,
    user_id: userId,
    page: typeof window !== 'undefined' ? window.location.pathname : null,
  });

  if (error) throw error;
}
