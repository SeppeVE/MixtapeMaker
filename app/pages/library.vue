<script setup lang="ts">
import type { Mixtape } from '~/types';
import { loadMixtapes, deleteMixtape } from '~/utils/database';
import { formatDuration } from '~/utils/timeUtils';
import '~/assets/styles/LibraryPage.css';

type Tab = 'mixtapes' | 'jcards';

const { user } = useAuth();
const route = useRoute();
const router = useRouter();
const {
  mixtape: currentDraft,
  isSaving: isSavingDraft,
  isAuthModalOpen,
  showToast,
  handleSave,
  handleLoadMixtape,
  handleNewMixtape,
  handleTogglePublic: onTogglePublic,
  handleEnableShare,
  openDesigner,
} = useAppMixtapeState();

const onGoHome = () => navigateTo('/');
const onOpenAuth = () => { isAuthModalOpen.value = true; };
const onNewCard = () => openDesigner(null);

const tabParam = computed(() => route.query.tab as string | undefined);
const activeTab = ref<Tab>(tabParam.value === 'jcards' ? 'jcards' : 'mixtapes');

const jcardLibrary = useJCardLibrary(showToast, onOpenAuth);
const { allCards } = jcardLibrary;

const cloudTapes = ref<Mixtape[]>([]);
const tapesLoading = ref(false);
const tapesError = ref<string | null>(null);

watch(tabParam, (tab) => {
  if (tab === 'jcards') activeTab.value = 'jcards';
  else if (tab === 'mixtapes') activeTab.value = 'mixtapes';
});

const setTab = (tab: Tab) => {
  activeTab.value = tab;
  router.replace({ query: tab === 'mixtapes' ? {} : { tab } });
};

const loadTapes = () => {
  if (!user.value) {
    cloudTapes.value = [];
    return;
  }
  tapesLoading.value = true;
  tapesError.value = null;
  loadMixtapes(user.value.id)
    .then((tapes) => { cloudTapes.value = tapes; })
    .catch(() => { tapesError.value = 'Failed to load cloud tapes'; })
    .finally(() => { tapesLoading.value = false; });
};

watch(user, () => loadTapes(), { immediate: true });

const draftHasSongs = computed(
  () => currentDraft.value.sideA.length > 0 || currentDraft.value.sideB.length > 0
);
const draftIsUnsaved = computed(
  () => draftHasSongs.value && !cloudTapes.value.some((t) => t.id === currentDraft.value.id)
);

const handleSaveDraftToCloud = async () => {
  await handleSave();
  if (user.value) {
    loadMixtapes(user.value.id).then((tapes) => { cloudTapes.value = tapes; }).catch(() => {});
  }
};

const handleDeleteTape = async (tape: Mixtape) => {
  if (!confirm(`Delete "${tape.title}"?`)) return;
  try {
    await deleteMixtape(tape.id);
    cloudTapes.value = cloudTapes.value.filter((t) => t.id !== tape.id);
    showToast('Tape deleted', 'info');
  } catch {
    showToast('Failed to delete tape', 'error');
  }
};

const togglePublic = async (tape: Mixtape) => {
  const next = !tape.isPublic;
  cloudTapes.value = cloudTapes.value.map((t) => (t.id === tape.id ? { ...t, isPublic: next } : t));
  try {
    await onTogglePublic(tape.id, next);
  } catch {
    cloudTapes.value = cloudTapes.value.map((t) => (t.id === tape.id ? { ...t, isPublic: tape.isPublic } : t));
  }
};

const buildShareUrl = (token: string) => `${window.location.origin}/share/${token}`;

const handleShare = async (tape: Mixtape) => {
  try {
    const token = tape.shareToken ?? (await handleEnableShare(tape.id));
    if (!tape.shareToken) {
      cloudTapes.value = cloudTapes.value.map((t) => (t.id === tape.id ? { ...t, shareToken: token } : t));
    }
    await navigator.clipboard.writeText(buildShareUrl(token));
    showToast('Share link copied to clipboard', 'success');
  } catch {
    showToast('Failed to create share link', 'error');
  }
};

const totalDuration = (m: Mixtape) =>
  [...m.sideA, ...m.sideB].reduce((s, t) => s + t.duration, 0);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
</script>

<template>
  <div class="lib-page">
    <NavBar :on-go-home="onGoHome" :on-open-auth="onOpenAuth">
      <button class="lp-nav-link" @click="onGoHome">◀ Home</button>
      <span class="lp-nav-sep">/</span>
      <span style="font-family: var(--font-body); font-size: 13px; color: var(--color-text)">Library</span>
    </NavBar>

    <div class="lib-header">
      <div class="lib-header-inner">
        <div>
          <div class="lib-page-eyebrow">◆ YOUR COLLECTION</div>
          <h1 class="lib-page-title">Library</h1>
        </div>
        <div class="lib-tabs">
          <button
            :class="`lib-tab${activeTab === 'mixtapes' ? ' lib-tab--active' : ''}`"
            @click="setTab('mixtapes')"
          >
            📼 Mixtapes
            <span v-if="cloudTapes.length > 0" class="lib-tab-count">{{ cloudTapes.length + (draftIsUnsaved ? 1 : 0) }}</span>
          </button>
          <button
            :class="`lib-tab${activeTab === 'jcards' ? ' lib-tab--active' : ''}`"
            @click="setTab('jcards')"
          >
            🎴 J-Cards
            <span v-if="allCards.length > 0" class="lib-tab-count">{{ allCards.length }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="lib-content">
      <div v-if="activeTab === 'mixtapes'" class="lib-section-stack">
        <section v-if="draftIsUnsaved" class="lib-section">
          <div class="lib-section-head">
            <span>Working Draft</span>
            <span class="lib-section-sub">Not yet saved to cloud</span>
          </div>
          <div
            class="lib-draft-card"
            role="button"
            tabindex="0"
            style="cursor: pointer"
            @click="handleLoadMixtape(currentDraft)"
            @keydown.enter="handleLoadMixtape(currentDraft)"
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
              <span class="lib-badge lib-badge-local">💾 Local</span>
              <button
                class="lp-btn lp-btn-forest"
                style="font-size: 16px; padding: 4px 14px 2px"
                :disabled="isSavingDraft"
                @click="user ? handleSaveDraftToCloud() : onOpenAuth()"
              >
                {{ isSavingDraft ? 'Saving…' : '☁ Save to Cloud' }}
              </button>
            </div>
          </div>
        </section>

        <section class="lib-section">
          <div class="lib-section-head">
            <span>Mixtapes</span>
            <button class="lp-btn lp-btn-mustard" style="font-size: 16px; padding: 4px 14px 2px" @click="handleNewMixtape">
              + New Tape
            </button>
          </div>

          <div v-if="!user" class="lib-sign-gate">
            <div class="lib-sign-gate-icon">☁</div>
            <p class="lib-sign-gate-text">Sign in to save tapes across devices and access them anywhere.</p>
            <button class="lp-btn lp-btn-plum" @click="onOpenAuth">Sign In →</button>
          </div>

          <div v-if="user && tapesLoading" class="lib-cards-grid">
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

          <div v-if="user && !tapesLoading && tapesError" class="lib-error-state">
            <span class="lib-error-icon">⚠</span>
            <span class="lib-error-msg">{{ tapesError }}</span>
            <button class="lp-btn lp-btn-mustard" style="font-size: 14px; padding: 4px 14px 2px" @click="loadTapes">
              ↻ Retry
            </button>
          </div>

          <div v-if="user && !tapesLoading && !tapesError && cloudTapes.length === 0" class="lib-empty">
            <div class="lib-empty-icon">📼</div>
            <p>No cloud tapes yet.</p>
            <p class="lib-empty-sub">Build a mixtape and hit "Save to Cloud" from the editor.</p>
            <button class="lp-btn lp-btn-mustard" style="margin-top: 8px" @click="handleNewMixtape">
              ▶ Make a Tape
            </button>
          </div>

          <div v-if="user && !tapesLoading && !tapesError && cloudTapes.length > 0" class="lib-cards-grid">
            <div
              v-for="tape in cloudTapes"
              :key="tape.id"
              class="lib-tape-card"
              role="button"
              tabindex="0"
              @click="handleLoadMixtape(tape)"
              @keydown.enter="handleLoadMixtape(tape)"
            >
              <div class="lib-tape-card-header">
                <span class="lib-tape-card-title">{{ tape.title }}</span>
              </div>
              <div class="lib-tape-card-actions">
                <span class="lib-badge lib-badge-cloud">☁ Cloud</span>
                <button
                  :class="`lib-public-toggle ${tape.isPublic ? 'lib-badge-public' : 'lib-badge-private'}`"
                  :title="tape.isPublic ? 'Public · click to make private' : 'Private · click to make public'"
                  @click.stop="togglePublic(tape)"
                >
                  {{ tape.isPublic ? '◉ Public' : '◌ Private' }}
                </button>
                <button
                  class="lib-public-toggle lib-badge-private"
                  title="Copy share link"
                  @click.stop="handleShare(tape)"
                >
                  🔗 Copy Link
                </button>
                <button
                  class="lib-delete-btn"
                  title="Delete"
                  @click.stop="handleDeleteTape(tape)"
                >×</button>
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
              <div class="lib-tape-card-footer">
                <span class="lib-tape-length">C-{{ tape.cassetteLength }}</span>
                <span class="lib-tape-date">{{ fmtDate(tape.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div v-if="activeTab === 'jcards'" class="lib-section-stack">
        <section class="lib-section">
          <div class="lib-section-head">
            <span>J-Cards</span>
            <button class="lp-btn lp-btn-mustard" style="font-size: 16px; padding: 4px 14px 2px" @click="onNewCard">
              + New Card
            </button>
          </div>
          <JCardLibrary
            embedded
            :library="jcardLibrary"
            :on-open-card="openDesigner"
            :on-new-card="onNewCard"
            :on-open-auth="onOpenAuth"
          />
        </section>
      </div>
    </div>
    <HomeFooter :on-new-mixtape="handleNewMixtape" />
  </div>
</template>
