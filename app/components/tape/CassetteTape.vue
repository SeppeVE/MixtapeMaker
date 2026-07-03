<script setup lang="ts">
import type { Mixtape, Side, Song, CassetteLength } from '~/types';
import '~/assets/styles/CassetteTape.css';

const props = defineProps<{
  mixtape: Mixtape;
  onRemoveSong: (songId: string, side: Side) => void;
  onReorderSongs: (side: Side, songs: Song[]) => void;
  onMoveSong: (songId: string, fromSide: Side, toSide: Side) => void;
  onCassetteLengthChange: (length: CassetteLength) => void;
}>();

const maxDurationPerSide = computed(() => (props.mixtape.cassetteLength / 2) * 60); // in seconds

const handleLengthChange = (e: Event) => {
  props.onCassetteLengthChange(Number((e.target as HTMLSelectElement).value) as CassetteLength);
};
</script>

<template>
  <div class="cassette-container">
    <div class="cassette-controls">
      <label for="cassette-length">Cassette Length:</label>
      <select
        id="cassette-length"
        :value="mixtape.cassetteLength"
        class="cassette-select"
        @change="handleLengthChange"
      >
        <option :value="60">60 min</option>
        <option :value="90">90 min</option>
        <option :value="120">120 min</option>
      </select>
    </div>

    <div class="j-card">
      <TapeSide
        side="A"
        :songs="mixtape.sideA"
        :max-duration="maxDurationPerSide"
        :on-remove-song="onRemoveSong"
        :on-reorder-songs="onReorderSongs"
        :on-move-song="onMoveSong"
      />
      <TapeSide
        side="B"
        :songs="mixtape.sideB"
        :max-duration="maxDurationPerSide"
        :on-remove-song="onRemoveSong"
        :on-reorder-songs="onReorderSongs"
        :on-move-song="onMoveSong"
      />
    </div>
  </div>
</template>
