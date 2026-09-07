<script setup lang="ts">
import { useMixtapeStore } from '~/stores/mixtape';
import { useUiStore } from '~/stores/ui';

const mixtape = useMixtapeStore();
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
      <div class="lp-foot-copyright">Mixtape Maker &copy; 2026</div>
    </div>
    <div class="lp-foot-note">Make mixtapes. Design J-cards. Press play.</div>
    <div class="footer-btn-group">
      <button type="button" class="lp-btn lp-btn-mustard footer-btn" @click="ui.openFeedback()">
        💡 Feedback
      </button>
      <a href="mailto:contact@mixtape-maker.com" class="lp-btn lp-btn-paper footer-btn">✉ Contact</a>
      <a
        href="https://www.buymeacoffee.com/seppe.ve"
        target="_blank"
        rel="noreferrer"
        class="height-max-content"
      >
        <img
          src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
          alt="Buy Me a Coffee"
          class="footer-logo"
        />
      </a>
    </div>
  </footer>
</template>
