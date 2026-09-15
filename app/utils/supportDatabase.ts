import { supabase } from './supabase';
import type { SupportPromptState } from './supportPrompt';

// Support-prompt preferences live in their own `user_preferences` table rather
// than on `profiles`: profiles are readable by everyone (bylines, /user pages)
// and are locked down with column-level grants, whereas these flags — including
// "clicked the donate link on <date>" — are nobody's business but the user's.
// Keep the column list in sync with the `user_preferences` table in SUPABASE_SETUP.md.
interface UserPreferencesRow {
  support_prompt_last_shown_at: string | null;
  support_prompt_opt_out: boolean | null;
  support_prompt_clicked_at: string | null;
  print_checklist_opt_out: boolean | null;
}

const PREF_COLUMNS =
  'support_prompt_last_shown_at, support_prompt_opt_out, support_prompt_clicked_at, print_checklist_opt_out';

function rowToState(row: UserPreferencesRow): SupportPromptState {
  return {
    supportPromptLastShownAt: row.support_prompt_last_shown_at ?? null,
    supportPromptOptOut: row.support_prompt_opt_out ?? false,
    supportPromptClickedAt: row.support_prompt_clicked_at ?? null,
    printChecklistOptOut: row.print_checklist_opt_out ?? false,
  };
}

/**
 * Load the user's support-prompt preferences. Resolves to null when the user
 * has no row yet. Throws on a real error (RLS, missing table) so the caller
 * can fall back to localStorage.
 */
export async function loadSupportPrefs(userId: string): Promise<SupportPromptState | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select(PREF_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToState(data as unknown as UserPreferencesRow) : null;
}

/** Write the full preference set (upsert, so the first write creates the row). */
export async function saveSupportPrefs(userId: string, state: SupportPromptState): Promise<void> {
  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId,
    support_prompt_last_shown_at: state.supportPromptLastShownAt,
    support_prompt_opt_out: state.supportPromptOptOut,
    support_prompt_clicked_at: state.supportPromptClickedAt,
    print_checklist_opt_out: state.printChecklistOptOut,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}
