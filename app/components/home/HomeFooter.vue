<script setup lang="ts">
import { useUiStore } from '~/stores/ui';
import { SUPPORT_URL } from '~/utils/supportPrompt';
import { trackEvent } from '~/utils/analytics';
import IconLightbulb from '~icons/mdi/lightbulb-outline';

// compact: drop the bottom credits/badge rail. Used on tool pages (the mixtape
// editor) where the full footer would squeeze the workspace to fit one viewport.
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });

const ui = useUiStore();
</script>

<template>
  <TapeStrip reverse />
  <footer class="lp-footer">
    <!-- Top row — brand on the left, actions on the right -->
    <div class="lp-foot-main">
      <div class="lp-foot-brand">
        <img
          class="lp-foot-logo-icon"
          src="/android-chrome-192x192.png"
          width="18"
          height="18"
          alt=""
          aria-hidden="true"
        >
        <div class="lp-foot-brand-text">
          <div class="lp-foot-logo">Mixtape Maker</div>
          <div class="lp-foot-note">Make mixtapes. Design J-cards. Record.</div>
        </div>
      </div>

      <div class="footer-btn-group">
        <button type="button" class="lp-btn lp-btn-mustard footer-btn" @click="ui.openFeedback()">
          <IconLightbulb class="icon-inline" aria-hidden="true" /> Feedback
        </button>
        <a href="https://www.buymeacoffee.com/seppe.ve">
          <img src="https://img.buymeacoffee.com/button-api/?text=Support me&emoji=☕&slug=seppe.ve&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" />
        </a>
      </div>
    </div>

    <!-- Bottom rail — credits on the left, featured badge on the right -->
    <div v-if="!compact" class="lp-foot-rail">
      <div class="lp-foot-credits">
        <span>Mixtape Maker &copy; 2026</span>
        <span><NuxtLink to="/privacy" class="lp-foot-link">Privacy</NuxtLink></span>
        <span>Free to use</span>
        <span>100% in your browser</span>
      </div>
      <a href="https://www.tinyshelf.co/?ref=mixtape-maker.com" title="Featured on TinyShelf">
        <img src="https://www.tinyshelf.co/badge/tinyshelf-badge-light-amber-1cdea1ce.svg"
             alt="Featured on TinyShelf" width="216" height="64"/>
      </a>
    </div>
  </footer>
</template>
