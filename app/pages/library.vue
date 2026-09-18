<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Mixtape, JCard } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { useMixtapeStore } from '~/stores/mixtape';
import { useJCardLibraryStore } from '~/stores/jcardLibrary';
import { loadMixtapes, deleteMixtape } from '~/utils/database';
import { formatDuration } from '~/utils/timeUtils';
import { isMixtapeUntitled } from '~/utils/mixtapeTitle';
import { SUPPORT_URL } from '~/utils/supportPrompt';
import { trackEvent } from '~/utils/analytics';
import IconEye from '~icons/mdi/eye';
import IconEyeOff from '~icons/mdi/eye-off';
import IconCassette from '~icons/ph/cassette-tape';
import IconCard from '~icons/material-symbols/devices-fold-2-sharp';
import IconCloud from '~icons/ic/baseline-wb-cloudy';
import IconLink from '~icons/material-symbols/add-link-rounded';
import IconTrash from '~icons/material-symbols/delete-outline';
import IconSave from '~icons/material-symbols/save-rounded';
import IconWarning from '~icons/material-symbols/warning-rounded';
import IconCoffee from '~icons/material-symbols/coffee-rounded';

type Tab = 'mixtapes' | 'jcards';

const auth = useAuthStore();
const ui = useUiStore();
const store = useMixtapeStore();
const jcardLibrary = useJCardLibraryStore();
const route = useRoute();
const router = useRouter();

const activeTab = computed<Tab>(() => (route.query.tab === 'jcards' ? 'jcards' : 'mixtapes'));
function setTab(tab: Tab) {
  router.replace({ query: tab === 'mixtapes' ? {} : { tab } });
}

const cloudTapes = ref<Mixtape[]>([]);
const tapesLoading = ref(false);
const tapesError = ref<string | null>(null);

const buildShareUrl = (token: string) => `${window.location.origin}/share/${token}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const totalDuration = (m: Mixtape) => [...m.sideA, ...m.sideB].reduce((s, t) => s + t.duration, 0);

const currentDraft = computed(() => store.mixtape);
const draftHasSongs = computed(() => currentDraft.value.sideA.length > 0 || currentDraft.value.sideB.length > 0);
const draftIsUnsaved = computed(() => draftHasSongs.value && !cloudTapes.value.some((t) => t.id === currentDraft.value.id));

async function loadTapes() {
  if (!auth.user) {
    cloudTapes.value = [];
    return;
  }
  tapesLoading.value = true;
  tapesError.value = null;
  try {
    cloudTapes.value = await loadMixtapes(auth.user.id);
  } catch {
    tapesError.value = 'Failed to load cloud tapes';
  } finally {
    tapesLoading.value = false;
  }
}

onMounted(() => {
  jcardLibrary.loadCards();
  loadTapes();
});
watch(() => auth.user, () => {
  jcardLibrary.loadCards();
  loadTapes();
});

async function handleSaveDraftToCloud() {
  const wasUntitled = isMixtapeUntitled(currentDraft.value.title);
  const saved = await store.save();
  if (!saved) {
    // The draft card here has no inline title field, so a blocked save due
    // to a missing name sends the user to the editor to rename it — store
    // .save() already toasted the reason. currentDraft *is* the store's
    // active mixtape already, so just navigate (store.loadMixtape() would
    // fire its own "Mixtape loaded" toast and stomp the one above).
    if (wasUntitled) router.push('/mixtape');
    return;
  }
  if (auth.user) {
    try {
      cloudTapes.value = await loadMixtapes(auth.user.id);
    } catch { /* ignore */ }
  }
}

async function handleDeleteTape(tape: Mixtape) {
  if (!confirm(`Delete "${tape.title}"?`)) return;
  try {
    await deleteMixtape(tape.id);
    cloudTapes.value = cloudTapes.value.filter((t) => t.id !== tape.id);
    ui.showToast('Tape deleted', 'info');
  } catch {
    ui.showToast('Failed to delete tape', 'error');
  }
}

async function handleTogglePublic(tape: Mixtape) {
  if (tape.isCopy) return;
  const next = !tape.isPublic;
  cloudTapes.value = cloudTapes.value.map((t) => (t.id === tape.id ? { ...t, isPublic: next } : t));
  const ok = await store.togglePublic(tape, next);
  if (!ok) {
    cloudTapes.value = cloudTapes.value.map((t) => (t.id === tape.id ? { ...t, isPublic: tape.isPublic } : t));
  }
}

async function handleShare(tape: Mixtape) {
  let url: string;
  try {
    const token = tape.shareToken ?? (await store.enableShare(tape.id));
    if (!tape.shareToken) {
      cloudTapes.value = cloudTapes.value.map((t) => (t.id === tape.id ? { ...t, shareToken: token } : t));
    }
    url = buildShareUrl(token);
  } catch {
    ui.showToast('Failed to create share link', 'error');
    return;
  }
  // Copy is best-effort (clipboard access can be denied); the modal always
  // carries the link and its own copy button, so a failed copy is not an error.
  let copied = false;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch { /* handled by the modal's copy button */ }
  ui.openSuccessModal({
    title: 'Share link ready',
    trigger: 'share',
    link: { url, openLabel: 'Open link' },
    copied,
    note: 'Anyone with this link can view the mixtape, even while it is private.',
  });
}

function openCard(card: JCard) {
  store.openDesigner(card);
}
function newCard() {
  store.openDesigner(null);
}
</script>

<template>
  <div class="lib-page">
    <NavBar library>
      <NuxtLink to="/" class="lp-nav-link">◀ Home</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span style="font-family:var(--font-body);font-size:13px;color:var(--color-text)">Library</span>
    </NavBar>

    <div class="lib-header">
      <div class="lib-header-inner">
        <div>
          <div class="lib-page-eyebrow">◆ YOUR COLLECTION</div>
          <h1 class="lib-page-title">Library</h1>
        </div>
        <div class="lib-tabs">
          <button :class="`lib-tab${activeTab === 'mixtapes' ? ' lib-tab--active' : ''}`" @click="setTab('mixtapes')">
            <IconCassette class="icon-inline" aria-hidden="true" /> Mixtapes
            <span v-if="cloudTapes.length > 0" class="lib-tab-count">{{ cloudTapes.length + (draftIsUnsaved ? 1 : 0) }}</span>
          </button>
          <button :class="`lib-tab${activeTab === 'jcards' ? ' lib-tab--active' : ''}`" @click="setTab('jcards')">
            <IconCard class="icon-inline" aria-hidden="true" /> J-Cards
            <span v-if="jcardLibrary.allCards.length > 0" class="lib-tab-count">{{ jcardLibrary.allCards.length }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="lib-content">
      <!-- MIXTAPES TAB -->
      <div v-if="activeTab === 'mixtapes'" class="lib-section-stack">
        <section v-if="draftIsUnsaved" class="lib-section">
          <div class="lib-section-head">
            <span>Working Draft</span>
            <span class="lib-section-sub">Not yet saved to cloud</span>
          </div>
          <div
            class="lib-draft-card"
            role="button"
            :tabindex="0"
            style="cursor:pointer"
            @click="store.loadMixtape(currentDraft)"
            @keydown.enter="store.loadMixtape(currentDraft)"
          >
            <div class="lib-draft-card-left">
              <div class="lib-draft-title">{{ currentDraft.title }}</div>
              <div class="lib-draft-meta">
                Side A · {{ currentDraft.sideA.length }} tracks &nbsp;·&nbsp;
                Side B · {{ currentDraft.sideB.length }} tracks &nbsp;·&nbsp;
                C-{{ currentDraft.cassetteLength }}
              </div>
            </div>
            <div class="lib-draft-card-right" @click.stop>
              <span class="lib-badge lib-badge-local"><IconSave class="icon-inline" aria-hidden="true" /> Local</span>
              <button
                class="lp-btn lp-btn-forest"
                style="font-size:16px;padding:4px 14px 2px"
                :disabled="store.isSaving"
                @click="auth.user ? handleSaveDraftToCloud() : ui.openAuth()"
              >
                <IconCloud v-if="!store.isSaving" class="icon-inline" aria-hidden="true" />
                {{ store.isSaving ? 'Saving…' : 'Save to Cloud' }}
              </button>
            </div>
          </div>
        </section>

        <section class="lib-section">
          <div class="lib-section-head">
            <span>Mixtapes</span>
            <button class="lp-btn lp-btn-mustard" style="font-size:16px;padding:4px 14px 2px" @click="store.newMixtape()">
              + New Tape
            </button>
          </div>

          <div v-if="!auth.user" class="lib-sign-gate">
            <IconCloud class="lib-sign-gate-icon" aria-hidden="true" />
            <p class="lib-sign-gate-text">Sign in to save tapes across devices and access them anywhere.</p>
            <button class="lp-btn lp-btn-plum" @click="ui.openAuth()">Sign In →</button>
          </div>

          <div v-else-if="tapesLoading" class="lib-cards-grid lib-cards-grid--tapes">
            <div v-for="n in 3" :key="n" class="lib-skeleton-tape">
              <div class="lib-skeleton-header" />
              <div class="lib-skeleton-body">
                <div class="lib-skeleton-line" />
                <div class="lib-skeleton-line lib-skeleton-line--short" />
                <div class="lib-skeleton-line lib-skeleton-line--short" />
              </div>
              <div class="lib-skeleton-footer" />
            </div>
          </div>

          <div v-else-if="tapesError" class="lib-error-state">
            <IconWarning class="lib-error-icon" aria-hidden="true" />
            <span class="lib-error-msg">{{ tapesError }}</span>
            <button class="lp-btn lp-btn-mustard" style="font-size:14px;padding:4px 14px 2px" @click="loadTapes">↻ Retry</button>
          </div>

          <div v-else-if="cloudTapes.length === 0" class="lib-empty">
            <IconCassette class="lib-empty-icon" aria-hidden="true" />
            <p>No cloud tapes yet.</p>
            <p class="lib-empty-sub">Build a mixtape and hit "Save to Cloud" from the editor.</p>
            <button class="lp-btn lp-btn-mustard" style="margin-top:8px" @click="store.newMixtape()">▶ Make a Tape</button>
          </div>

          <div v-else class="lib-cards-grid lib-cards-grid--tapes">
            <div
              v-for="tape in cloudTapes"
              :key="tape.id"
              class="lib-tape-card lib-tape-card--owned"
              role="button"
              :tabindex="0"
              @click="store.loadMixtape(tape)"
              @keydown.enter="store.loadMixtape(tape)"
            >
              <div class="lib-tape-card-header">
                <span class="lib-tape-card-title">{{ tape.title }}</span>
              </div>
              <!-- Read-only status strip: badges say what the tape *is*, never what you can do to it. -->
              <div class="lib-tape-card-meta">
                <div class="lib-tape-card-meta-row">
                  <span class="lib-badge lib-badge-cloud"><IconCloud class="icon-inline" aria-hidden="true" /> Cloud</span>
                  <span
                    class="lib-badge"
                    :class="tape.isPublic ? 'lib-badge-public' : 'lib-badge-private'"
                    :title="tape.isPublic ? 'Public · listed on the explore page' : 'Private · not listed on the explore page'"
                  >
                    <component :is="tape.isPublic ? IconEye : IconEyeOff" class="visibility-toggle-icon" aria-hidden="true" />
                    {{ tape.isPublic ? 'Public' : 'Private' }}
                  </span>
                  <span class="lib-tape-card-spec">C-{{ tape.cassetteLength }} · {{ fmtDate(tape.updatedAt) }}</span>
                </div>
                <p v-if="tape.isCopy" class="lib-copy-note">
                  This is an unedited copy of another mixtape, and will not show up in the explore page
                </p>
              </div>
              <div class="lib-tape-card-body">
                <div class="lib-tape-row">
                  <span class="lib-tape-label">Side A</span>
                  <span class="lib-tape-value">{{ tape.sideA.length }} tracks</span>
                </div>
                <div class="lib-tape-row">
                  <span class="lib-tape-label">Side B</span>
                  <span class="lib-tape-value">{{ tape.sideB.length }} tracks</span>
                </div>
                <div class="lib-tape-row">
                  <span class="lib-tape-label">Total</span>
                  <span class="lib-tape-value">{{ formatDuration(totalDuration(tape)) }}</span>
                </div>
              </div>
              <!-- Action footer: everything here is a real button on paper, not a chip on mustard.
                   The two share controls share a row when the card is wide enough and stack
                   when it isn't; Delete stays pinned to the right either way. -->
              <div class="lib-tape-card-actions" @click.stop>
                <div class="lib-tape-card-actions-main">
                  <button class="lp-btn lp-btn-plum lib-tape-action" title="Copy share link" @click="handleShare(tape)">
                    <IconLink class="icon-inline" aria-hidden="true" /> Copy link
                  </button>
                  <button
                    class="lp-btn lp-btn-paper lib-tape-action"
                    :disabled="tape.isCopy"
                    :title="tape.isCopy ? 'This is an unedited copy of another mixtape, and will not show up in the explore page' : tape.isPublic ? 'Hide this tape from the explore page' : 'Show this tape on the explore page'"
                    @click="handleTogglePublic(tape)"
                  >
                    <VisibilityToggleIcon :is-public="tape.isPublic" />
                    {{ tape.isPublic ? 'Make private' : 'Make public' }}
                  </button>
                </div>
                <button class="btn lib-tape-delete" title="Delete tape" @click="handleDeleteTape(tape)">
                  <IconTrash class="icon-inline" aria-hidden="true" /> Delete
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Low-key support card. Passive placement: no suppression, no interruption. -->
        <aside class="lib-support-card">
          <div class="lib-support-card-text">
            <div class="lib-support-card-title">Support the project</div>
            <p>
              Mixtape Maker is made by one person, free and without ads.
              If it earned a spot in your routine, a coffee keeps the tape rolling.
            </p>
          </div>
          <a
            class="lp-btn lp-btn-mustard lib-support-card-btn"
            :href="SUPPORT_URL"
            target="_blank"
            rel="noopener noreferrer"
            @click="trackEvent('support_block_clicked', { trigger: 'library' })"
          >
            <IconCoffee class="icon-inline" aria-hidden="true" /> Buy me a coffee
          </a>
        </aside>
      </div>

      <!-- J-CARDS TAB -->
      <div v-else class="lib-section-stack">
        <section class="lib-section">
          <div class="lib-section-head">
            <span>J-Cards</span>
            <button class="lp-btn lp-btn-mustard" style="font-size:16px;padding:4px 14px 2px" @click="newCard">
              + New Card
            </button>
          </div>
          <JCardLibrary embedded :mixtapes="cloudTapes" @open-card="openCard" @new-card="newCard" />
        </section>
      </div>
    </div>
    <HomeFooter />
  </div>
</template>
