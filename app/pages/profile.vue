<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSeoMeta } from '#app';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { useProfileStore } from '~/stores/profile';
import {
  normalizeUsername,
  usernameError,
  isUsernameTakenError,
  uploadAvatar,
  deleteAvatar,
  USERNAME_MAX_LENGTH,
} from '~/utils/profileDatabase';

useSeoMeta({ title: 'Your Profile — Mixtape Maker', robots: 'noindex' });

const auth = useAuthStore();
const ui = useUiStore();
const profileStore = useProfileStore();

const profile = computed(() => profileStore.profile);

// ── Username ──
const usernameInput = ref('');
const usernameSaving = ref(false);
watch(profile, (p) => { if (p) usernameInput.value = p.username; }, { immediate: true });

const usernameNormalized = computed(() => normalizeUsername(usernameInput.value));
const usernameProblem = computed(() => usernameError(usernameNormalized.value));
const usernameDirty = computed(() => !!profile.value && usernameNormalized.value !== profile.value.username);

async function saveUsername() {
  if (!usernameDirty.value || usernameProblem.value) return;
  usernameSaving.value = true;
  try {
    await profileStore.update({ username: usernameNormalized.value });
    ui.showToast('Username updated', 'success');
  } catch (err) {
    ui.showToast(isUsernameTakenError(err) ? 'That username is already taken' : 'Failed to update username', 'error');
  } finally {
    usernameSaving.value = false;
  }
}

// ── Avatar ──
const avatarInput = ref<HTMLInputElement | null>(null);
const avatarUploading = ref(false);

async function onAvatarPicked(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !auth.user) return;
  if (!file.type.startsWith('image/')) {
    ui.showToast('Please choose an image file', 'error');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    ui.showToast('Image must be under 8 MB', 'error');
    return;
  }
  avatarUploading.value = true;
  try {
    const previous = profile.value?.avatarUrl ?? null;
    const url = await uploadAvatar(file, auth.user.id);
    await profileStore.update({ avatarUrl: url });
    if (previous) deleteAvatar(previous);
    ui.showToast('Profile picture updated', 'success');
  } catch (err) {
    console.error(err);
    ui.showToast('Upload failed — is the "avatars" storage bucket set up?', 'error');
  } finally {
    avatarUploading.value = false;
  }
}

async function removeAvatar() {
  const previous = profile.value?.avatarUrl;
  if (!previous) return;
  avatarUploading.value = true;
  try {
    await profileStore.update({ avatarUrl: null });
    deleteAvatar(previous);
  } catch {
    ui.showToast('Failed to remove picture', 'error');
  } finally {
    avatarUploading.value = false;
  }
}

// ── Privacy ──
const privacySaving = ref(false);
async function togglePrivate() {
  if (!profile.value) return;
  privacySaving.value = true;
  try {
    const next = !profile.value.isPrivate;
    await profileStore.update({ isPrivate: next });
    ui.showToast(next ? 'Your profile is now private' : 'Your profile is now public', 'success');
  } catch {
    ui.showToast('Failed to update privacy', 'error');
  } finally {
    privacySaving.value = false;
  }
}

const profileUrl = computed(() => (profile.value ? `/user/${profile.value.username}` : '/'));
const initial = computed(() => (profile.value?.username ?? '?').slice(0, 1).toUpperCase());
</script>

<template>
  <div class="lib-page">
    <NavBar library>
      <NuxtLink to="/" class="lp-nav-link">◀ Home</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span style="font-family:var(--font-body);font-size:13px;color:var(--color-text)">Profile</span>
    </NavBar>

    <div class="lib-header">
      <div class="lib-header-inner">
        <div>
          <div class="lib-page-eyebrow">◆ YOUR ACCOUNT</div>
          <h1 class="lib-page-title">Profile</h1>
        </div>
        <NuxtLink v-if="profile" :to="profileUrl" class="lp-btn lp-btn-paper">View public page →</NuxtLink>
      </div>
    </div>

    <div class="lib-content">
      <div v-if="!auth.user && !auth.loading" class="lib-sign-gate">
        <div class="lib-sign-gate-icon">☺</div>
        <p class="lib-sign-gate-text">Sign in to set up your profile, pick a username and choose a profile picture.</p>
        <button class="lp-btn lp-btn-plum" @click="ui.openAuth()">Sign In →</button>
      </div>

      <p v-else-if="auth.loading || profileStore.loading" style="padding:40px;text-align:center">Loading…</p>

      <div v-else-if="profileStore.error || !profile" class="lib-error-state">
        <span class="lib-error-icon">⚠</span>
        <span class="lib-error-msg">{{ profileStore.error ?? 'Profile unavailable' }}</span>
        <button class="lp-btn lp-btn-mustard" @click="profileStore.load()">↻ Retry</button>
      </div>

      <div v-else class="lib-section-stack">
        <!-- Picture -->
        <section class="lib-section">
          <div class="lib-section-head"><span>Profile picture</span></div>
          <div class="pf-avatar-row">
            <div class="pf-avatar pf-avatar--lg">
              <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="" >
              <span v-else>{{ initial }}</span>
            </div>
            <div class="pf-avatar-actions">
              <input ref="avatarInput" type="file" accept="image/*" hidden @change="onAvatarPicked" >
              <button class="lp-btn lp-btn-mustard" :disabled="avatarUploading" @click="avatarInput?.click()">
                {{ avatarUploading ? 'Uploading…' : profile.avatarUrl ? '⇧ Change picture' : '⇧ Upload picture' }}
              </button>
              <button v-if="profile.avatarUrl" class="btn" :disabled="avatarUploading" @click="removeAvatar">Remove</button>
              <p class="pf-hint">Square works best. It's cropped to a circle and resized to 256 px.</p>
            </div>
          </div>
        </section>

        <!-- Username -->
        <section class="lib-section">
          <div class="lib-section-head">
            <span>Username</span>
            <span class="lib-section-sub">Your profile lives at /user/{{ usernameNormalized || '…' }}</span>
          </div>
          <form class="pf-form-row" @submit.prevent="saveUsername">
            <div class="pf-input-wrap">
              <span class="pf-input-prefix">@</span>
              <input
                v-model="usernameInput"
                class="pf-input"
                type="text"
                autocomplete="off"
                spellcheck="false"
                :maxlength="USERNAME_MAX_LENGTH"
                :disabled="usernameSaving"
              >
            </div>
            <button type="submit" class="lp-btn lp-btn-forest" :disabled="!usernameDirty || !!usernameProblem || usernameSaving">
              {{ usernameSaving ? 'Saving…' : 'Save' }}
            </button>
          </form>
          <p v-if="usernameDirty && usernameProblem" class="pf-hint pf-hint--warn">{{ usernameProblem }}</p>
          <p v-else class="pf-hint">3–24 characters: lowercase letters, numbers, _ and -. Changing it changes your profile link.</p>
        </section>

        <!-- Privacy -->
        <section class="lib-section">
          <div class="lib-section-head"><span>Privacy</span></div>
          <div class="pf-privacy-row">
            <div>
              <p class="pf-privacy-title">
                {{ profile.isPrivate ? '◌ Your profile is private' : '◉ Your profile is public' }}
              </p>
              <p class="pf-hint">
                <template v-if="profile.isPrivate">
                  Visitors see "This user has set their profile to private". Your public mixtapes still show up on Explore.
                </template>
                <template v-else>
                  Anyone can open your profile and browse your public mixtapes and public J-cards.
                </template>
              </p>
            </div>
            <button
              :class="`lib-public-toggle ${profile.isPrivate ? 'lib-badge-private' : 'lib-badge-public'}`"
              :disabled="privacySaving"
              @click="togglePrivate"
            >
              {{ profile.isPrivate ? 'Make public' : 'Make private' }}
            </button>
          </div>
        </section>

        <!-- Content shortcuts -->
        <section class="lib-section">
          <div class="lib-section-head"><span>Your content</span></div>
          <p class="pf-hint" style="margin-bottom:12px">
            Which mixtapes and J-cards appear on your profile is controlled per item with the Public / Private toggles in your library.
          </p>
          <div class="pf-links">
            <NuxtLink to="/library" class="lp-btn lp-btn-paper">📼 Mixtapes</NuxtLink>
            <NuxtLink to="/library?tab=jcards" class="lp-btn lp-btn-paper">🎴 J-Cards</NuxtLink>
          </div>
        </section>
      </div>
    </div>
    <HomeFooter />
  </div>
</template>
