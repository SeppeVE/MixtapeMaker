<script setup lang="ts">
import '~/assets/styles/utilities.css';

defineProps<{
  onNewMixtape: () => void;
}>();
</script>

<template>
  <section id="mixtape" class="lp-section" style="background: var(--color-paper); border-bottom: 3px solid var(--color-text)">
    <!-- Geo decorations -->
    <div class="decorative-square decorative-square-mixtape" />
    <div class="decorative-triangle-mixtape">
      <svg width="60" height="60"><polygon points="30,4 56,52 4,52" fill="none" stroke="#3D5A47" stroke-width="2" /></svg>
    </div>
    <div class="absolute-inset dither-bg-inverse pointer-events-none z-0" />

    <div class="lp-section-inner">
      <div class="lp-split">
        <div class="lp-split-text">
          <div class="lp-section-label" style="color: var(--color-text-light)">Feature 01</div>
          <h2 class="lp-section-title" style="color: var(--color-plum)">The Mixtape<br>Editor.</h2>
          <p class="lp-section-body" style="color: var(--color-text-light)">
            Add tracks to Side A and Side B, and watch the length bar fill
            up in real time because of the auto length calculation. Select the length of your tape and easily fill it with your favourite songs.
          </p>
          <ul class="lp-feature-list" style="color: var(--color-text-light)">
            <li>Drag-and-drop track ordering for both sides</li>
            <li>Real-time tape fill meter with over-length warnings</li>
            <li>Supports C-46, C-60, C-90, and custom tape lengths</li>
          </ul>
          <div>
            <button class="lp-btn lp-btn-forest" style="font-size: 22px; padding: 7px 22px 4px" @click="onNewMixtape">
              ▶ Try the Mixtape Editor →
            </button>
          </div>
        </div>

        <div class="lp-split-visual">
          <MixtapeEditorMock />
        </div>
      </div>
    </div>
  </section>
</template>
