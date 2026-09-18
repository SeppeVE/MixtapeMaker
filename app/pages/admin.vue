<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useSeoMeta } from '#app';
import type { AppNotification, FeedbackEntry, Profile } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { useProfileStore } from '~/stores/profile';
import {
  listNotifications,
  createNotification,
  deleteNotification,
  NOTIFICATION_TITLE_MAX_LENGTH,
  NOTIFICATION_BODY_MAX_LENGTH,
} from '~/utils/notificationDatabase';
import { listFeedback, deleteFeedback } from '~/utils/feedbackDatabase';
import { loadProfilesByIds } from '~/utils/profileDatabase';
import IconLightbulb from '~icons/mdi/lightbulb-outline';
import IconLock from '~icons/material-symbols/lock-rounded';
import IconStar from '~icons/material-symbols/star-rounded';
import IconWarning from '~icons/material-symbols/warning-rounded';
import IconMail from '~icons/material-symbols/mail-rounded';

useSeoMeta({ title: 'Admin — Mixtape Maker', robots: 'noindex' });

const auth = useAuthStore();
const ui = useUiStore();
const profileStore = useProfileStore();

const ready = computed(() => !auth.loading && !profileStore.loading);
const allowed = computed(() => ready.value && profileStore.isAdmin);

const notifications = ref<AppNotification[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const title = ref('');
const body = ref('');
const linkUrl = ref('');
const linkLabel = ref('');
const posting = ref(false);

async function load() {
  if (!allowed.value) return;
  loading.value = true;
  error.value = null;
  try {
    notifications.value = await listNotifications();
  } catch {
    error.value = 'Failed to load notifications';
  } finally {
    loading.value = false;
  }
}

const feedback = ref<FeedbackEntry[]>([]);
const feedbackAuthors = ref<Map<string, Profile>>(new Map());
const feedbackLoading = ref(false);
const feedbackError = ref<string | null>(null);

async function loadFeedback() {
  if (!allowed.value) return;
  feedbackLoading.value = true;
  feedbackError.value = null;
  try {
    feedback.value = await listFeedback();
    // Feedback only stores the user id; resolve usernames so entries from
    // signed-in users link to their public profile. Best-effort: a failure
    // here just leaves the entries unattributed.
    try {
      feedbackAuthors.value = await loadProfilesByIds(
        feedback.value.map((f) => f.userId).filter((id): id is string => !!id),
      );
    } catch {
      feedbackAuthors.value = new Map();
    }
  } catch {
    feedbackError.value = 'Failed to load feedback — is the admin SELECT policy on the feedback table set up?';
  } finally {
    feedbackLoading.value = false;
  }
}

// Each entry paired with its author's profile (null for anonymous entries
// and deleted accounts) so the template needs no lookups.
const feedbackRows = computed(() =>
  feedback.value.map((entry) => ({
    entry,
    author: entry.userId ? feedbackAuthors.value.get(entry.userId) ?? null : null,
  })),
);

async function removeFeedback(f: FeedbackEntry) {
  if (!confirm('Delete this feedback entry? This cannot be undone.')) return;
  try {
    await deleteFeedback(f.id);
    feedback.value = feedback.value.filter((x) => x.id !== f.id);
    ui.showToast('Feedback deleted', 'info');
  } catch {
    ui.showToast('Failed to delete', 'error');
  }
}

function loadAll() {
  load();
  loadFeedback();
}

onMounted(loadAll);
watch(allowed, loadAll);

const canPost = computed(() => !!title.value.trim() && !!body.value.trim() && !posting.value);

async function post() {
  if (!canPost.value || !auth.user) return;
  if (!confirm('Post this notification? Every signed-in user will see it on their next visit to the homepage.')) return;
  posting.value = true;
  try {
    const created = await createNotification(
      { title: title.value.trim(), body: body.value.trim(), linkUrl: linkUrl.value.trim() || null, linkLabel: linkLabel.value.trim() || null },
      auth.user.id,
    );
    notifications.value = [created, ...notifications.value];
    title.value = '';
    body.value = '';
    linkUrl.value = '';
    linkLabel.value = '';
    ui.showToast('Notification posted', 'success');
  } catch (err) {
    console.error(err);
    ui.showToast('Failed to post — are you an admin and is the notifications table set up?', 'error');
  } finally {
    posting.value = false;
  }
}

async function remove(n: AppNotification) {
  if (!confirm(`Delete "${n.title}"?`)) return;
  try {
    await deleteNotification(n.id);
    notifications.value = notifications.value.filter((x) => x.id !== n.id);
    ui.showToast('Notification deleted', 'info');
  } catch {
    ui.showToast('Failed to delete', 'error');
  }
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
</script>

<template>
  <div class="lib-page">
    <NavBar library>
      <NuxtLink to="/" class="lp-nav-link">◀ Home</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span style="font-family:var(--font-body);font-size:13px;color:var(--color-text)">Admin</span>
    </NavBar>

    <div class="lib-header">
      <div class="lib-header-inner">
        <div>
          <div class="lib-page-eyebrow">◆ SITE ADMIN</div>
          <h1 class="lib-page-title">Notifications &amp; Feedback</h1>
        </div>
      </div>
    </div>

    <div class="lib-content">
      <p v-if="!ready" style="padding:40px;text-align:center">Loading…</p>

      <div v-else-if="!allowed" class="lib-empty">
        <IconLock class="lib-empty-icon" aria-hidden="true" />
        <p>Admins only.</p>
        <p class="lib-empty-sub">{{ auth.user ? 'Your account does not have admin access.' : 'Sign in with an admin account.' }}</p>
        <button v-if="!auth.user" class="lp-btn lp-btn-plum" style="margin-top:8px" @click="ui.openAuth()">Sign In →</button>
      </div>

      <div v-else class="lib-section-stack">
        <section class="lib-section">
          <div class="lib-section-head">
            <span>New notification</span>
            <span class="lib-section-sub">Users only ever see the newest one</span>
          </div>
          <form class="adm-form" @submit.prevent="post">
            <div class="form-group">
              <label for="adm-title">Title</label>
              <input id="adm-title" v-model="title" type="text" :maxlength="NOTIFICATION_TITLE_MAX_LENGTH" placeholder="New: two-sided J-card export" :disabled="posting" >
            </div>
            <div class="form-group">
              <label for="adm-body">Message</label>
              <textarea id="adm-body" v-model="body" rows="6" :maxlength="NOTIFICATION_BODY_MAX_LENGTH" placeholder="Tell people what changed…" :disabled="posting" />
              <span class="char-count">{{ NOTIFICATION_BODY_MAX_LENGTH - body.length }} characters left</span>
            </div>
            <div class="adm-form-row">
              <div class="form-group">
                <label for="adm-link">Link (optional)</label>
                <input id="adm-link" v-model="linkUrl" type="url" placeholder="https://mixtape-maker.com/how-to" :disabled="posting" >
              </div>
              <div class="form-group">
                <label for="adm-link-label">Link label</label>
                <input id="adm-link-label" v-model="linkLabel" type="text" maxlength="40" placeholder="Read the guide" :disabled="posting" >
              </div>
            </div>
            <div class="adm-form-actions">
              <button type="submit" class="lp-btn lp-btn-forest" :disabled="!canPost">
                <IconStar v-if="!posting" class="icon-inline" aria-hidden="true" />
                {{ posting ? 'Posting…' : 'Post notification' }}
              </button>
            </div>
          </form>
        </section>

        <section class="lib-section">
          <div class="lib-section-head">
            <span>History</span>
            <span class="lib-section-sub">Newest first · the top one is what users see</span>
          </div>

          <p v-if="loading" class="lib-loading">Loading…</p>
          <div v-else-if="error" class="lib-error-state">
            <IconWarning class="lib-error-icon" aria-hidden="true" />
            <span class="lib-error-msg">{{ error }}</span>
            <button class="lp-btn lp-btn-mustard" @click="load">↻ Retry</button>
          </div>
          <div v-else-if="notifications.length === 0" class="lib-empty">
            <IconStar class="lib-empty-icon" aria-hidden="true" />
            <p>No notifications posted yet.</p>
          </div>
          <ul v-else class="adm-list">
            <li v-for="(n, i) in notifications" :key="n.id" class="adm-item">
              <div class="adm-item-main">
                <div class="adm-item-head">
                  <span v-if="i === 0" class="lib-badge lib-badge-public">◉ Live</span>
                  <strong class="adm-item-title">{{ n.title }}</strong>
                  <span class="adm-item-date">{{ fmtDate(n.createdAt) }}</span>
                </div>
                <p class="adm-item-body">{{ n.body }}</p>
                <a v-if="n.linkUrl" :href="n.linkUrl" class="pf-inline-link" target="_blank" rel="noopener">{{ n.linkLabel || n.linkUrl }}</a>
              </div>
              <button class="lib-delete-btn" title="Delete" @click="remove(n)">×</button>
            </li>
          </ul>
        </section>

        <section class="lib-section">
          <div class="lib-section-head">
            <span>Feedback</span>
            <span class="lib-section-sub">
              {{ feedback.length }} {{ feedback.length === 1 ? 'entry' : 'entries' }} · newest first · delete once handled
            </span>
          </div>

          <p v-if="feedbackLoading" class="lib-loading">Loading…</p>
          <div v-else-if="feedbackError" class="lib-error-state">
            <IconWarning class="lib-error-icon" aria-hidden="true" />
            <span class="lib-error-msg">{{ feedbackError }}</span>
            <button class="lp-btn lp-btn-mustard" @click="loadFeedback">↻ Retry</button>
          </div>
          <div v-else-if="feedback.length === 0" class="lib-empty">
            <IconLightbulb class="lib-empty-icon" aria-hidden="true" />
            <p>No feedback yet.</p>
            <p class="lib-empty-sub">Entries sent through the Feedback button in the footer show up here.</p>
          </div>
          <ul v-else class="adm-list">
            <li v-for="{ entry: f, author } in feedbackRows" :key="f.id" class="adm-item">
              <div class="adm-item-main">
                <div class="adm-item-head">
                  <NuxtLink
                    v-if="author"
                    :to="`/user/${author.username}`"
                    class="pf-inline-link adm-feedback-author"
                  >@{{ author.username }}</NuxtLink>
                  <span v-else class="adm-feedback-author adm-feedback-anon">
                    {{ f.userId ? 'Deleted account' : 'Anonymous' }}
                  </span>
                  <span class="adm-item-date">{{ fmtDate(f.createdAt) }}</span>
                </div>
                <p class="adm-item-body">{{ f.message }}</p>
                <div class="adm-feedback-meta">
                  <a v-if="f.email" :href="`mailto:${f.email}`" class="pf-inline-link" style="display:inline-flex;align-items:center;gap:4px"><IconMail class="icon-inline" aria-hidden="true" /> {{ f.email }}</a>
                  <span v-else style="display:inline-flex;align-items:center;gap:4px"><IconMail class="icon-inline" aria-hidden="true" /> no email left</span>
                  <span v-if="f.page">· sent from <code>{{ f.page }}</code></span>
                </div>
              </div>
              <button class="lib-delete-btn" title="Delete" @click="removeFeedback(f)">×</button>
            </li>
          </ul>
        </section>
      </div>
    </div>
    <HomeFooter />
  </div>
</template>
