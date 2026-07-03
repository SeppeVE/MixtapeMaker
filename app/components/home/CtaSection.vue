<script setup lang="ts">
import type { User } from '@supabase/supabase-js';
import type { Mixtape } from '~/types';

defineProps<{
  onNewMixtape: () => void;
  onOpenJCards: () => void;
  onLoadMixtape: (mixtape: Mixtape) => void;
  user: User | null;
  recentTapes: Mixtape[];
}>();

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
</script>

<template>
  <section class="lp-cta-section">
    <div class="lp-section-inner">
      <div class="lp-cta-inner">
        <div class="lp-cta-headline">Ready to<br>make a tape?</div>

        <div class="lp-cta-cards">
          <button class="lp-cta-card" @click="onNewMixtape">
            <div class="lp-cta-card-head" style="background: var(--color-forest)">
              <div class="lp-cta-card-icon">📼</div>
              <div class="lp-cta-card-title">Mixtape Editor</div>
              <p class="lp-cta-card-desc">Build, balance, and perfect your track list with real-time tape length calculation.</p>
            </div>
            <div class="lp-cta-card-foot">
              <span>Start mixing</span>
              <span>→</span>
            </div>
          </button>

          <button class="lp-cta-card" @click="onOpenJCards">
            <div class="lp-cta-card-head" style="background: var(--color-plum)">
              <div class="lp-cta-card-icon">🃏</div>
              <div class="lp-cta-card-title">J-Card Designer</div>
              <p class="lp-cta-card-desc">Upload cover art, style the spine and back panel, and export a print-ready PDF.</p>
            </div>
            <div class="lp-cta-card-foot">
              <span>Start designing</span>
              <span>→</span>
            </div>
          </button>
        </div>

        <div style="font-family: var(--font-display); font-size: 18px; letter-spacing: 1px; opacity: 0.5; color: var(--color-text)">
          No account · No cost · 100% in your browser
        </div>

        <!-- Recent tapes for signed-in users -->
        <div v-if="user && recentTapes.length > 0" class="lp-recent">
          <div class="lp-recent-heading">⌯ Your Recent Tapes</div>
          <div class="lp-recent-row">
            <div v-for="tape in recentTapes" :key="tape.id" class="lp-tape-card" @click="onLoadMixtape(tape)">
              <div class="lp-tape-card-top">
                <span class="lp-tape-card-title">{{ tape.title }}</span>
                <span class="lp-tape-card-len">C{{ tape.cassetteLength }}</span>
              </div>
              <div class="lp-tape-card-body">
                A · {{ tape.sideA.length }} trk<br>
                B · {{ tape.sideB.length }} trk
              </div>
              <div class="lp-tape-card-footer">
                <span class="lp-tape-card-action">▶ Load</span>
                <span class="lp-tape-card-date">{{ formatDate(tape.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
