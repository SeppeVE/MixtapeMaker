<script setup lang="ts">
import { useMixtapeStore } from '~/stores/mixtape';

const mixtape = useMixtapeStore();
</script>

<template>
  <TapeStrip reverse />
  <footer class="lp-footer">
    <div class="lp-foot-logo">
      <svg width="18" height="12" viewBox="0 0 20 14" fill="none" class="align-middle">
        <rect x="1" y="1" width="18" height="12" rx="2" stroke="#2A1E28" stroke-width="1.5" fill="none" />
        <circle cx="6" cy="8" r="2.5" stroke="#2A1E28" stroke-width="1.5" fill="none" />
        <circle cx="14" cy="8" r="2.5" stroke="#2A1E28" stroke-width="1.5" fill="none" />
        <rect x="4" y="10.5" width="12" height="1" fill="#2A1E28" />
      </svg>
      CASSETTE
    </div>
    <div class="lp-foot-note">Make mixtapes. Design J-cards. Press play.</div>
    <div class="footer-btn-group">
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
