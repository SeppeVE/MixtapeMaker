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
        <div class="mock-jcard-spine-section">SUMMER DRIVE '94</div>

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

        <div class="mock-jcard-back-panel">
          <div class="mock-jcard-side-title">SIDE A (17:21)</div>
          <div v-for="(t, i) in SIDE_A_TRACKS" :key="'a' + i" class="mock-jcard-track">{{ t }}</div>
          <div class="mock-jcard-side-b-title">SIDE B (18:05)</div>
          <div v-for="(t, i) in SIDE_B_TRACKS" :key="'b' + i" class="mock-jcard-track">{{ t }}</div>
          <div class="mock-jcard-footer"><span>Apr 2026</span></div>
        </div>
      </div>

      <div style="margin-top:10px;display:flex;gap:8px">
        <div class="lp-btn lp-btn-plum" style="font-size:16px;padding:4px 14px 2px;cursor:default;box-shadow:2px 2px 0 var(--color-text)">↓ Export PDF</div>
        <div class="lp-btn lp-btn-paper" style="font-size:16px;padding:4px 14px 2px;cursor:default;box-shadow:2px 2px 0 var(--color-text)">↓ Export PNG</div>
      </div>
    </div>
  </div>
</template>
