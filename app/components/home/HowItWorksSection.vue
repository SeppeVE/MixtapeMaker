<script setup lang="ts">
const STEPS = [
  { number: '01', title: 'Build your tracklist', desc: 'Search for songs to add using Spotify results. Adding the songs will automatically calculate the time left on the cassette making it easy to fill the list with the perfect amount and length of songs', tag: 'Mixtape Editor' },
  { number: '02', title: 'Fine-tune the sequence', desc: 'Rearrange tracks by dragging them up and down. Balance both sides so neither ends with dead air. Obsess over the running order — it matters.', tag: 'Mixtape Editor' },
  { number: '03', title: 'Design your J-Card', desc: 'Switch to the J-Card designer, upload cover art, add your title and tracklist, style the spine — then export a print-ready PDF sized to fold into a standard cassette case.', tag: 'J-Card Designer' },
];
</script>

<template>
  <section id="how-it-works" class="lp-how">
    <div class="lp-section-inner">
      <div style="text-align:center;margin-bottom:52px">
        <div class="lp-section-label" style="color:var(--color-mustard);letter-spacing:3px">Process</div>
        <h2 class="lp-section-title" style="color:var(--color-paper);margin-top:8px">How it works.</h2>
      </div>
      <div class="lp-steps-grid">
        <div v-for="s in STEPS" :key="s.number" class="lp-step">
          <div class="lp-step-number">{{ s.number }}</div>
          <h3 class="lp-step-title">{{ s.title }}</h3>
          <p class="lp-step-desc">{{ s.desc }}</p>
          <div class="lp-step-tag">{{ s.tag }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
