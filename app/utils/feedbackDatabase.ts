import { supabase } from './supabase';

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
    message,
    email: email || null,
    user_id: userId,
    page: typeof window !== 'undefined' ? window.location.pathname : null,
  });

  if (error) throw error;
}
