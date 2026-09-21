<script setup lang="ts">
import { useUiStore } from '~/stores/ui';
import IconLightbulb from '~icons/mdi/lightbulb-outline';

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
  </footer>
</template>
