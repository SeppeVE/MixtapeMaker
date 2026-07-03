<script setup lang="ts">
import '~/assets/styles/jcard/JCardView.css';

const router = useRouter();
const {
  mixtape,
  activeCard,
  isAuthModalOpen,
  showToast,
} = useAppMixtapeState();

const onOpenAuth = () => { isAuthModalOpen.value = true; };
const onOpenLibrary = () => navigateTo('/library');
</script>

<template>
  <div class="editor editor-side-a" style="overflow-y: auto">
    <NavBar
      :on-go-home="() => navigateTo('/')"
      :on-open-auth="onOpenAuth"
      :on-open-library="onOpenLibrary"
    >
      <button class="lp-nav-link" @click="router.back()">Back</button>
      <span class="lp-nav-sep">/</span>
      <span style="font-family: var(--font-body); font-size: 13px; color: var(--color-text)">
        Designer
      </span>
    </NavBar>
    <div class="designer-mobile-warning">
      This designer is built for desktop — layout and editing work best on a wider screen.
    </div>
    <div style="flex: 1; overflow-y: auto">
      <JCardView
        :initial-card="activeCard"
        :current-mixtape="mixtape"
        :on-back="() => navigateTo('/library?tab=jcards')"
        :show-toast="showToast"
      />
    </div>
    <div class="jcard-page-footer">
      <HomeFooter />
    </div>
  </div>
</template>
