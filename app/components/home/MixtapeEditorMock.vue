<script setup lang="ts">
const MOCK_SONGS = [
  { title: 'Fade Into You', artist: 'Mazzy Star', dur: '3:35' },
  { title: 'Dreams', artist: 'Fleetwood Mac', dur: '4:14' },
  { title: 'The Chain', artist: 'Fleetwood Mac', dur: '4:30' },
  { title: 'Running Up That Hill', artist: 'Kate Bush', dur: '5:02' },
];
</script>

<template>
  <div class="lp-mock-window lp-shadow-lg">
    <!-- App-style title bar -->
    <div class="mock-title-bar">
      <div class="mock-close-btn">×</div>
      <span class="mock-nav-breadcrumb">◀ Library</span>
      <span class="mock-nav-separator">/</span>
      <span>Summer Drive '94</span>
      <div class="mock-spacer" />
      <span class="mock-save-btn">Save</span>
    </div>

    <!-- Side header -->
    <div class="mock-side-header">
      <span class="mock-side-title">◀ SIDE A</span>
      <span class="mock-time-display">17:21 / 30:00</span>
    </div>

    <!-- Song list -->
    <div class="mock-song-list">
      <div v-for="(song, i) in MOCK_SONGS" :key="i" class="mock-song-item">
        <div class="mock-song-number">
          {{ i + 1 }}
          <div class="mock-song-corner" />
        </div>
        <div class="mock-song-content">
          <div class="mock-song-title">{{ song.title }}</div>
          <div class="mock-song-artist">{{ song.artist }}</div>
        </div>
        <div class="mock-song-duration">{{ song.dur }}</div>
      </div>

      <!-- Ghost "add" row -->
      <div class="mock-song-add">
        <div class="mock-add-icon">+</div>
        <span class="mock-add-text">add a track…</span>
      </div>
    </div>

    <!-- Tape meter footer -->
    <div class="mock-tape-footer">
      <div class="mock-tape-stats">
        <span class="mock-tape-used">Used: 17:21</span>
        <span class="mock-tape-free">12:39 free</span>
      </div>
      <div class="mock-tape-bar">
        <div class="mock-tape-fill" />
        <div class="mock-tape-grid">
          <div v-for="j in 9" :key="j" class="mock-tape-grid-line" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mock-save-btn {
  background: var(--color-plum);
  color: var(--color-paper);
  padding: 2px 10px 1px;
  font-family: var(--font-display);
  font-size: 14px;
  border-radius: 2px;
}

.mock-song-number {
  background: var(--color-forest);
  color: var(--color-paper);
  font-family: var(--font-display);
  font-size: 13px;
  min-width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 2px solid var(--color-text);
  padding: 5px 4px;
  position: relative;
  flex-shrink: 0;
}

.mock-song-corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 6px;
  background: var(--color-seafoam);
  border-left: 1.5px solid var(--color-text);
  border-bottom: 1.5px solid var(--color-text);
}

.mock-song-duration {
  font-family: var(--font-display);
  font-size: 15px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  color: var(--color-text);
  opacity: 0.7;
  flex-shrink: 0;
}

.mock-song-add {
  display: flex;
  align-items: center;
  background: var(--color-paper);
  border: 2px dashed rgba(42,30,40,0.25);
  padding: 6px 9px;
  opacity: 0.45;
  gap: 8px;
}

.mock-add-icon {
  min-width: 30px;
  text-align: center;
  font-family: var(--font-display);
  font-size: 16px;
  opacity: 0.5;
}

.mock-add-text {
  font-size: 11px;
  font-style: italic;
}
</style>
