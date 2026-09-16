<script setup lang="ts">
import { useUiStore } from '~/stores/ui';
import { SUPPORT_URL } from '~/utils/supportPrompt';
import { trackEvent } from '~/utils/analytics';

const ui = useUiStore();
</script>

<template>
  <TapeStrip reverse />
  <footer class="lp-footer">
    <div class="lp-foot-brand">
      <div class="lp-foot-logo">
        <img
          class="lp-foot-logo-icon"
          src="/android-chrome-192x192.png"
          width="18"
          height="18"
          alt=""
          aria-hidden="true"
        >
        Mixtape Maker
      </div>
      <div class="lp-foot-copyright">
        Mixtape Maker &copy; 2026 · <NuxtLink to="/privacy" class="lp-foot-link">Privacy</NuxtLink>
      </div>
    </div>
    <div class="lp-foot-note">Free, ad-free, made by one person. Make mixtapes. Design J-cards. Press play.</div>
    <div class="footer-btn-group">
      <button type="button" class="lp-btn lp-btn-mustard footer-btn" @click="ui.openFeedback()">
        💡 Feedback
      </button>
      <a href="mailto:contact@mixtape-maker.com" class="lp-btn lp-btn-paper footer-btn">✉ Contact</a>
      <a
        :href="SUPPORT_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="lp-btn lp-btn-mustard footer-btn"
        @click="trackEvent('support_block_clicked', { trigger: 'footer' })"
      >
        ☕ Buy me a coffee
      </a>
      <a href="https://www.tinyshelf.co/?ref=mixtape-maker.com" title="Featured on TinyShelf">
        <img src="https://www.tinyshelf.co/badge/tinyshelf-badge-light-amber-1cdea1ce.svg"
             alt="Featured on TinyShelf" width="216" height="64"/>
      </a>
    </div>
  </footer>
</template>
