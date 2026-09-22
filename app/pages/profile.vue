<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSeoMeta, navigateTo } from '#app';
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
  BIO_MAX_LENGTH,
  deleteOwnAccount,
} from '~/utils/profileDatabase';
import { containsProfanity } from '~/utils/profanity';
import IconCassette from '~icons/ph/cassette-tape';
import IconCard from '~icons/material-symbols/devices-fold-2-sharp';
import IconTrash from '~icons/material-symbols/delete-outline';
import IconWarning from '~icons/material-symbols/warning-rounded';
import IconSmiley from '~icons/material-symbols/sentiment-satisfied-rounded';
import IconLogout from '~icons/material-symbols/logout-rounded';

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
const usernameProblem = computed(
  () => usernameError(usernameNormalized.value) ?? (containsProfanity(usernameNormalized.value) ? "That username isn't allowed" : null),
);
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

// ── Bio ──
const bioInput = ref('');
const bioSaving = ref(false);
watch(profile, (p) => { if (p) bioInput.value = p.bio ?? ''; }, { immediate: true });

const bioTrimmed = computed(() => bioInput.value.trim());
const bioDirty = computed(() => !!profile.value && bioTrimmed.value !== (profile.value.bio ?? ''));
const bioProblem = computed(() => (containsProfanity(bioTrimmed.value) ? "Your bio contains language that isn't allowed" : null));

async function saveBio() {
  if (!bioDirty.value || bioProblem.value) return;
  bioSaving.value = true;
  try {
    await profileStore.update({ bio: bioTrimmed.value || null });
    ui.showToast('Bio updated', 'success');
  } catch {
    ui.showToast('Failed to update bio', 'error');
  } finally {
    bioSaving.value = false;
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

// ── Sign out ──
const signingOut = ref(false);
async function signOut() {
  signingOut.value = true;
  try {
    await auth.signOut();
    ui.showToast('Signed out', 'info');
    navigateTo('/');
  } finally {
    signingOut.value = false;
  }
}

// ── Delete account ──
const deleting = ref(false);
async function deleteAccount() {
  if (!auth.user || !profile.value) return;
  const typed = prompt(
    `This permanently deletes your account, profile, cloud mixtapes, J-cards and uploaded images. It cannot be undone.\n\nType your username (${profile.value.username}) to confirm:`,
  );
  if (typed === null) return;
  if (typed.trim().toLowerCase() !== profile.value.username) {
    ui.showToast("Username didn't match — nothing was deleted", 'info');
    return;
  }
  deleting.value = true;
  try {
    await deleteOwnAccount(auth.user.id);
    ui.showToast('Your account has been deleted', 'info');
    navigateTo('/');
  } catch (err) {
    console.error(err);
    ui.showToast('Could not delete your account — please email contact@mixtape-maker.com', 'error');
  } finally {
    deleting.value = false;
  }
}

const profileUrl = computed(() => (profile.value ? `/user/${profile.value.username}` : '/'));
const initial = computed(() => (profile.value?.username ?? '?').slice(0, 1).toUpperCase());
</script>

<template>
  <div class="lib-page">
    <div class="lib-screen">
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
        <IconSmiley class="lib-sign-gate-icon" aria-hidden="true" />
        <p class="lib-sign-gate-text">Sign in to set up your profile, pick a username and choose a profile picture.</p>
        <button class="lp-btn lp-btn-plum" @click="ui.openAuth()">Sign In →</button>
      </div>

      <p v-else-if="auth.loading || profileStore.loading" style="padding:40px;text-align:center">Loading…</p>

      <div v-else-if="profileStore.error || !profile" class="lib-error-state">
        <IconWarning class="lib-error-icon" aria-hidden="true" />
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

        <!-- Bio -->
        <section class="lib-section">
          <div class="lib-section-head">
            <span>Bio</span>
            <span class="lib-section-sub">{{ BIO_MAX_LENGTH - bioInput.length }} characters left</span>
          </div>
          <form class="pf-bio-form" @submit.prevent="saveBio">
            <textarea
              v-model="bioInput"
              class="pf-textarea"
              rows="4"
              :maxlength="BIO_MAX_LENGTH"
              :disabled="bioSaving"
              placeholder="A few words about you and the tapes you make…"
            />
            <div class="pf-bio-actions">
              <p v-if="bioDirty && bioProblem" class="pf-hint pf-hint--warn">{{ bioProblem }}</p>
              <p v-else class="pf-hint">Shown on your public profile page.</p>
              <button type="submit" class="lp-btn lp-btn-forest" :disabled="!bioDirty || !!bioProblem || bioSaving">
                {{ bioSaving ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </form>
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
              <VisibilityToggleIcon :is-public="!profile.isPrivate" />
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
            <NuxtLink to="/library" class="lp-btn lp-btn-paper"><IconCassette class="icon-inline" aria-hidden="true" /> Mixtapes</NuxtLink>
            <NuxtLink to="/library?tab=jcards" class="lp-btn lp-btn-paper"><IconCard class="icon-inline" aria-hidden="true" /> J-Cards</NuxtLink>
          </div>
        </section>

        <!-- Account -->
        <section class="lib-section">
          <div class="lib-section-head"><span>Account</span></div>
          <div class="pf-privacy-row">
            <p class="pf-hint" style="margin:0">Signed in as <strong>{{ auth.user?.email }}</strong>. Your mixtapes and J-cards stay saved in the cloud.</p>
            <button class="lp-btn lp-btn-plum" :disabled="signingOut" @click="signOut">
              <IconLogout v-if="!signingOut" class="icon-inline" aria-hidden="true" />
              {{ signingOut ? 'Signing out…' : 'Sign Out' }}
            </button>
          </div>
          <div class="pf-danger">
            <div>
              <p class="pf-privacy-title">Delete account</p>
              <p class="pf-hint">
                Removes your account, profile, cloud mixtapes, J-cards and uploaded images for good. Mixtapes and J-cards
                saved only in this browser are not touched. See the <NuxtLink to="/privacy" class="pf-inline-link">privacy policy</NuxtLink> for details.
              </p>
            </div>
            <button class="btn pf-danger-btn" :disabled="deleting" @click="deleteAccount">
              <IconTrash v-if="!deleting" class="icon-inline" aria-hidden="true" />
              {{ deleting ? 'Deleting…' : 'Delete my account' }}
            </button>
          </div>
        </section>
      </div>
      </div>
      <HomeFooterMain />
    </div>
    <HomeFooterRail />
  </div>
</template>
