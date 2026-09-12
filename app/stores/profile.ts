import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { Profile } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { loadOrCreateOwnProfile, updateProfile as updateProfileRow } from '~/utils/profileDatabase';

/**
 * The signed-in user's own profile row. Loaded once per session (and again
 * whenever the auth user changes), shared by the nav, the dashboard, the
 * notification popup and the admin gate.
 */
export const useProfileStore = defineStore('profile', () => {
  const auth = useAuthStore();

  const profile = ref<Profile | null>(null);
  // Mirrors auth.loading: true until the first load for the current user settles.
  const loading = ref(import.meta.client);
  const error = ref<string | null>(null);

  const isAdmin = computed(() => profile.value?.isAdmin === true);
  /** What the nav shows: the chosen username, or the email prefix until the profile loads. */
  const displayName = computed(
    () => profile.value?.username ?? auth.user?.email?.split('@')[0] ?? '',
  );

  let started = false;
  let requestSeq = 0;

  async function load() {
    const user = auth.user;
    const seq = ++requestSeq;
    if (!user) {
      profile.value = null;
      loading.value = false;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const loaded = await loadOrCreateOwnProfile(user.id, user.email);
      if (seq === requestSeq) profile.value = loaded;
    } catch (err) {
      console.error('Failed to load profile:', err);
      if (seq === requestSeq) error.value = 'Failed to load profile';
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  }

  /** Follow the auth session. Call once on the client (auth plugin). */
  function init() {
    if (started || !import.meta.client) return;
    started = true;
    watch(
      () => [auth.loading, auth.user?.id] as const,
      ([authLoading]) => {
        if (!authLoading) load();
      },
      { immediate: true },
    );
  }

  async function update(patch: Parameters<typeof updateProfileRow>[1]): Promise<Profile> {
    if (!auth.user) throw new Error('Not signed in');
    const next = await updateProfileRow(auth.user.id, patch);
    profile.value = next;
    return next;
  }

  async function markNotificationSeen(notificationId: string) {
    if (!profile.value || profile.value.seenNotificationId === notificationId) return;
    await update({ seenNotificationId: notificationId });
  }

  return { profile, loading, error, isAdmin, displayName, init, load, update, markNotificationSeen };
});
