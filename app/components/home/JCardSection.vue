<script setup lang="ts">
import IconSparkle from '~icons/material-symbols/auto-awesome-rounded';
</script>

<template>
  <section id="jcard" class="lp-section lp-section--jcard">
    <!-- Geo decorations -->
    <div class="decorative-triangle">
      <svg width="70" height="70"><polygon points="35,2 68,62 2,62" fill="none" stroke="#2A1E28" stroke-width="2" /></svg>
    </div>
    <div class="decorative-square decorative-square-jcard" />

    <div class="lp-section-inner">
      <div class="lp-split lp-split-reverse">
        <div class="lp-split-text">
          <div class="lp-section-label lp-section-label--forest">Feature 02</div>
          <h2 class="lp-section-title lp-section-title--ink">The J-Card<br />Designer.</h2>
          <p class="lp-section-body lp-section-body--muted">
            Every great mixtape deserves a proper J-card. Upload cover art, style the spine
            with your tape's title, lay out the track list on the back, or one of the inside panels, and export a
            perfectly-sized PDF ready to fold and slip in the case.
          </p>
          <p class="lp-section-body lp-section-body--muted">
            J-card can also be designed without needing to make a mixtape first.
          </p>
          <ul class="lp-feature-list lp-feature-list--muted">
            <li>Full J-card template: spine, front and back panels</li>
            <li>Upload your own cover or full-width background art</li>
            <li>Auto-imports track list from your mixtape</li>
            <li>Export as print-ready PDF or high-res PNG</li>
          </ul>
          <div>
            <NuxtLink to="/library?tab=jcards" class="lp-btn lp-btn-plum lp-btn-md">
              <IconSparkle class="icon-inline" aria-hidden="true" /> Design your J-Card →
            </NuxtLink>
          </div>
        </div>

        <div class="lp-split-visual">
          <JCardMock />
        </div>
      </div>
    </div>
  </section>
</template>
