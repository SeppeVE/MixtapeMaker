<script setup lang="ts">
import { ref, watch } from 'vue';
import type { AppNotification } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { useProfileStore } from '~/stores/profile';
import { loadLatestNotification } from '~/utils/notificationDatabase';
import IconStar from '~icons/material-symbols/star-rounded';

// Homepage announcement popup. Shows the single newest notification to a
// signed-in user until they either close it (hidden for this browser tab)
// or click "Don't show again" (remembered on their profile row).
const auth = useAuthStore();
const profileStore = useProfileStore();

const notification = ref<AppNotification | null>(null);
const open = ref(false);
const saving = ref(false);

const SESSION_KEY = 'mixtape-notification-dismissed';

function dismissedThisSession(id: string): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === id;
  } catch {
    return false;
  }
}

let fetchedFor: string | null = null;

async function check() {
  const profile = profileStore.profile;
  if (!auth.user || !profile) {
    open.value = false;
    return;
  }
  // One fetch per signed-in user; the profile's seen id is re-read on every pass.
  if (fetchedFor !== auth.user.id) {
    fetchedFor = auth.user.id;
    try {
      notification.value = await loadLatestNotification();
    } catch (err) {
      console.error('Failed to load notification:', err);
      notification.value = null;
    }
  }
  const latest = notification.value;
  open.value = !!latest && latest.id !== profile.seenNotificationId && !dismissedThisSession(latest.id);
}

watch(() => [auth.user?.id, profileStore.profile?.id] as const, check, { immediate: true });

function close() {
  if (notification.value) {
    try {
      sessionStorage.setItem(SESSION_KEY, notification.value.id);
    } catch { /* ignore */ }
  }
  open.value = false;
}

async function dontShowAgain() {
  if (!notification.value) return;
  saving.value = true;
  try {
    await profileStore.markNotificationSeen(notification.value.id);
  } catch (err) {
    console.error('Failed to mark notification seen:', err);
  } finally {
    saving.value = false;
    close();
  }
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
</script>

<template>
  <div v-if="open && notification" class="modal-overlay" @click="close">
    <div class="modal-content notif-modal" role="dialog" aria-modal="true" aria-labelledby="notif-title" @click.stop>
      <button class="modal-close" aria-label="Close" @click="close">×</button>

      <h2 id="notif-title" class="notif-modal-heading"><IconStar class="icon-inline" aria-hidden="true" /> What's new</h2>

      <div class="notif-date">{{ fmtDate(notification.createdAt) }}</div>
      <h3 class="notif-title">{{ notification.title }}</h3>
      <p class="notif-body">{{ notification.body }}</p>

      <a
        v-if="notification.linkUrl"
        :href="notification.linkUrl"
        class="lp-btn lp-btn-mustard notif-link"
        target="_blank"
        rel="noopener"
      >
        {{ notification.linkLabel || 'Check it out' }} →
      </a>

      <div class="notif-actions">
        <button class="btn" @click="close">Close</button>
        <button class="btn btn-primary" :disabled="saving" @click="dontShowAgain">
          {{ saving ? 'Saving…' : "Don't show again" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* .modal-overlay / .modal-content / .modal-close stay global (AuthModal.css). */
.notif-modal {
  max-width: 460px;
}

.notif-date {
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-text-light);
  opacity: 0.7;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.notif-title {
  font-family: var(--font-display);
  font-size: 26px;
  line-height: 1.05;
  color: var(--color-text);
  margin: 0 0 10px;
  font-weight: normal;
}

.notif-body {
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.55;
  color: var(--color-text);
  white-space: pre-line;
  margin: 0 0 var(--spacing-md);
  max-height: 40vh;
  overflow-y: auto;
}

.notif-link {
  font-size: 17px;
  margin-bottom: var(--spacing-md);
}

.notif-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 2px solid rgba(42, 30, 40, 0.15);
  padding-top: var(--spacing-md);
}

/* Heading with a leading icon. */
.notif-modal-heading {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
