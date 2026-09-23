<script setup lang="ts">
const SIDE_A_TRACKS = ['1. Fade Into You — 3:35', '2. Dreams — 4:14', '3. The Chain — 4:30', '4. Running Up That Hill — 5:02'];
const SIDE_B_TRACKS = ['1. Blue — 3:12', '2. Heroes — 6:07', '3. Maps — 3:40', '4. Lovefool — 3:01'];
const ART_LINES = [80, 60, 50, 70, 45];
</script>

<template>
  <div class="mock-jcard-window">
    <!-- Toolbar -->
    <div class="mock-jcard-toolbar">
      <div class="mock-close-btn">×</div>
      <span class="mock-nav-breadcrumb">◀ Editor</span>
      <span class="mock-nav-separator">/</span>
      <span>✦ J-Cards</span>
      <div class="mock-spacer" />
      <span class="mock-export-btn">↓ Export PDF</span>
    </div>

    <!-- Card library row -->
    <div class="mock-library-bar">
      <span class="mock-library-tab">✦ J-Cards</span>
      <div class="mock-spacer" />
      <span class="mock-new-card-btn">+ New Card</span>
    </div>

    <!-- J-Card preview area -->
    <div class="mock-jcard-preview-area">
      <div class="mock-jcard-container">
        <div class="mock-jcard-cover-flap">
          <div class="mock-jcard-cover-art">
            <div class="mock-jcard-art-placeholder">
              <div v-for="(w, k) in ART_LINES" :key="k" class="mock-jcard-art-line" :style="{ width: `${w}%` }" />
            </div>
            <div class="mock-jcard-art-label">cover art</div>
          </div>
          <div class="mock-jcard-title-strip">
            <div class="mock-jcard-title">Summer Drive '94</div>
            <div class="mock-jcard-subtitle">
              <span class="mock-jcard-artist">Mixed by me</span>
            </div>
          </div>
        </div>

        <div class="mock-jcard-spine-section">SUMMER DRIVE '94</div>

        <div class="mock-jcard-back-panel">
          <div class="mock-jcard-side-title">SIDE A (17:21)</div>
          <div v-for="(t, i) in SIDE_A_TRACKS" :key="'a' + i" class="mock-jcard-track">{{ t }}</div>
          <div class="mock-jcard-side-b-title">SIDE B (18:05)</div>
          <div v-for="(t, i) in SIDE_B_TRACKS" :key="'b' + i" class="mock-jcard-track">{{ t }}</div>
          <div class="mock-jcard-footer"><span>Apr 2026</span></div>
        </div>
      </div>

      <div class="mock-jcard-actions">
        <div class="lp-btn lp-btn-plum lp-btn-sm mock-jcard-btn">↓ Export PDF</div>
        <div class="lp-btn lp-btn-paper lp-btn-sm mock-jcard-btn">↓ Export PNG</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* J-Card Mock Styles */
.mock-jcard-window {
  box-shadow: 8px 8px 0 var(--color-text);
  border: 2.5px solid var(--color-text);
}

.mock-jcard-toolbar {
  background: var(--color-paper);
  border-bottom: 2px solid var(--color-text);
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 18px;
}

.mock-export-btn {
  font-family: var(--font-display);
  font-size: 16px;
  background: var(--color-mustard);
  color: var(--color-text);
  padding: 2px 12px 1px;
  border: 1.5px solid var(--color-text);
  box-shadow: 2px 2px 0 var(--color-text);
}

.mock-library-bar {
  background: var(--color-paper);
  border-bottom: 2px solid var(--color-text);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.mock-library-tab {
  font-family: var(--font-display);
  font-size: 16px;
  background: var(--color-mustard);
  color: var(--color-text);
  padding: 2px 10px 1px;
  border: 1.5px solid var(--color-text);
  box-shadow: 2px 2px 0 var(--color-text);
  cursor: default;
}

.mock-new-card-btn {
  font-family: var(--font-display);
  font-size: 15px;
  opacity: 0.5;
}

.mock-jcard-preview-area {
  background: #e8e0cc;
  padding: 16px;
}

.mock-jcard-container {
  display: flex;
  border: 2px solid var(--color-text);
  box-shadow: 4px 4px 0 var(--color-text);
  background: var(--color-paper);
}

.mock-jcard-spine-section {
  width: 34px;
  background: var(--color-plum);
  border-right: 2px solid var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--color-paper);
  padding: 10px 0;
  flex-shrink: 0;
  user-select: none;
}

.mock-jcard-cover-flap {
  flex: 1.15;
  display: flex;
  flex-direction: column;
  border-right: 2px solid var(--color-text);
  min-height: 200px;
}

.mock-jcard-cover-art {
  flex: 1;
  background: var(--color-text-light);
  background-image:
    repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 8px),
    repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 12px;
  min-height: 130px;
  position: relative;
  overflow: hidden;
}

.mock-jcard-art-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  opacity: 0.15;
}

.mock-jcard-art-line {
  height: 3px;
  background: white;
  border-radius: 2px;
}

.mock-jcard-art-label {
  font-family: var(--font-body);
  font-size: 9px;
  color: rgba(255,255,255,0.25);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.mock-jcard-title-strip {
  padding: 7px 10px;
  border-top: 2px solid var(--color-text);
  background: var(--color-paper);
}

.mock-jcard-title {
  font-family: var(--font-display);
  font-size: 15px;
  letter-spacing: 0.5px;
  color: var(--color-text);
  line-height: 1.2;
}

.mock-jcard-subtitle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 3px;
}

.mock-jcard-artist {
  font-family: var(--font-body);
  font-size: 9px;
  color: var(--color-text-light);
  opacity: 0.7;
}

.mock-jcard-back-panel {
  flex: 1;
  padding: 9px;
  background: #FAF6EB;
  font-family: var(--font-body);
  font-size: 10px;
  color: var(--color-text-light);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.mock-jcard-side-title {
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 1px;
  margin-bottom: 3px;
  color: var(--color-plum);
}

.mock-jcard-track {
  padding-bottom: 2px;
}

.mock-jcard-side-b-title {
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 1px;
  margin-top: 5px;
  margin-bottom: 3px;
  color: var(--color-plum);
}

.mock-jcard-footer {
  margin-top: auto;
  padding-top: 6px;
  display: flex;
  justify-content: space-between;
  opacity: 0.4;
  font-size: 9px;
}

/* Decorative export buttons in the J-card mock. They are divs, not real
   buttons, so they opt out of .lp-btn's pointer and lift on hover. */
.mock-jcard-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

/* box-shadow is nested under the mock's root so it outranks .lp-btn:hover
   and .lp-btn:active (both 0-2-0), exactly as the inline style used to.
   transform is deliberately left alone — the old inline style did not set
   it, so the hover/active nudge from .lp-btn still applies. */
.mock-jcard-btn {
  cursor: default;
}

.mock-jcard-window .mock-jcard-btn,
.mock-jcard-window .mock-jcard-btn:hover,
.mock-jcard-window .mock-jcard-btn:active {
  box-shadow: 2px 2px 0 var(--color-text);
}
</style>
