<script setup lang="ts">
import '~/assets/styles/utilities.css';

defineProps<{
  onNewMixtape: () => void;
  onOpenJCards: () => void;
}>();
</script>

<template>
  <section id="hero" class="lp-hero">
    <!-- Dither background -->
    <div class="absolute-inset pointer-events-none dither-bg" />

    <!-- Geometric floaters -->
    <div class="hero-floater-container">
      <svg width="100%" height="100%">
        <polygon points="80,60 130,140 30,140" fill="#D4A935" stroke="#2A1E28" stroke-width="2" opacity="0.35" />
        <polygon points="900,80 960,190 840,190" fill="#B4A0C7" stroke="#2A1E28" stroke-width="2" opacity="0.25" />
        <rect x="1000" y="300" width="48" height="48" fill="#8FC9B7" stroke="#2A1E28" stroke-width="2" opacity="0.3" transform="rotate(18,1024,324)" />
        <circle cx="120" cy="480" r="32" fill="none" stroke="#D4A935" stroke-width="2" opacity="0.2" />
        <polygon points="1100,500 1130,460 1160,500 1130,540" fill="#5B2838" stroke="#2A1E28" stroke-width="2" opacity="0.4" />
        <rect x="60" y="350" width="30" height="30" fill="#A8C4A2" stroke="#2A1E28" stroke-width="2" opacity="0.25" transform="rotate(30,75,365)" />
      </svg>
    </div>

    <div class="lp-hero-inner">
      <!-- Left: copy -->
      <div class="lp-hero-left">
        <div class="lp-hero-eyebrow icon-button"><span class="icon">◆</span><span>MIXTAPE MAKER</span></div>

        <h1 class="lp-hero-headline">
          MIX.<br>DESIGN.<br><span class="lp-hero-headline-accent">ENJOY.</span>
        </h1>

        <p class="lp-hero-sub">
          Mixtape Maker: build cassette mixtapes with Spotify search and auto length
          calculation, then design beautiful print-ready J-cards.
        </p>

        <div class="lp-hero-ctas">
          <button class="lp-btn lp-btn-mustard lp-btn-lg icon-button" @click="onNewMixtape"><span class="icon">▶</span><span>Make a Tape</span></button>
          <button class="lp-btn lp-btn-paper lp-btn-lg icon-button" @click="onOpenJCards"><span class="icon">✦</span><span>Design a J-Card</span></button>
        </div>

        <div class="lp-hero-note">Free to use · Works in your browser · Sign in to sync to the cloud</div>
      </div>

      <!-- Right: animated cassette -->
      <div class="lp-hero-right">
        <CassetteSVG />
      </div>
    </div>
  </section>
</template>
