<script setup lang="ts">
import { computed } from 'vue';

// Visible copy below the editor and the designer. Both tools only mount on the
// client and have little text of their own, so without this Google saw a page
// with nothing but a title and filed it as "Crawled - currently not indexed".
// The copy is written for each tool and doesn't repeat the how-to guide, so the
// three pages don't compete as duplicates.
const props = defineProps<{ tool: 'mixtape' | 'designer' }>();

type Step = { title: string; body: string };
type Faq = { q: string; a: string };

const CONTENT: Record<'mixtape' | 'designer', {
  eyebrow: string;
  heading: string;
  intro: string;
  steps: Step[];
  faqs: Faq[];
  other: { to: string; label: string };
}> = {
  mixtape: {
    eyebrow: '◆ THE MIXTAPE EDITOR',
    heading: 'Plan a cassette mixtape, one side at a time',
    intro: 'A cassette plays one side, then you flip it. A song that runs past the end of Side A gets cut off, so a good tape is planned per side. The editor adds up the real length of every song you pick from Spotify and checks each side against your tape, so you know it fits before you press record.',
    steps: [
      { title: 'Pick a tape length', body: 'Choose C30, C45, C60, C90, C100 or C120. Each side gets half: a C60 gives you 30 minutes on Side A and 30 on Side B.' },
      { title: 'Add songs from Spotify', body: 'Search by song or artist and add a result to Side A or Side B. Searching needs no Spotify account.' },
      { title: 'Balance the sides', body: 'Drag songs into order, move one to the other side, or shuffle a side. A side that runs over shows by how much, and one with a lot of dead air left at the end gets flagged too.' },
      { title: 'Keep it, share it, play it', body: 'Save the tape to your account, make it public on Explore, export it as a Spotify playlist, or start a matching J-card with one click.' },
    ],
    faqs: [
      { q: 'How many songs fit on a 60-minute cassette?', a: 'Usually 14 to 16, at three and a half to four minutes a song, split over two 30-minute sides. Long songs bring that down fast, which is why the editor counts real track lengths instead of songs.' },
      { q: 'What happens when a side is too long?', a: 'The side shows how far over it is. Move the last song to the other side, swap it for a shorter one, or pick a longer tape. Most tapes have a few seconds of extra length, but it is safer not to count on it.' },
      { q: 'Is the mixtape editor free?', a: 'Yes. You can plan a tape without signing in and it stays in your browser. Sign in when you want to save it to the cloud or open it on another device.' },
    ],
    other: { to: '/cards/designer', label: 'Design a J-card for it' },
  },
  designer: {
    eyebrow: '◆ THE J-CARD DESIGNER',
    heading: 'Make a cassette J-card that fits the case',
    intro: 'A J-card is the folded paper insert in a cassette case: the cover you see through the front, the spine you read on the shelf, and the back flap. The designer lays them out at the real size, 102 mm tall with a 12.7 mm spine, so the PDF you export cuts and folds to fit a standard case.',
    steps: [
      { title: 'Start from a tape or a preset', body: 'Press "Create j-card" in the mixtape editor to get a card with your tracklist already on it, or start from a preset such as Vaporwave, Kraft Minimal or Punk Zine.' },
      { title: 'Fill in the panels', body: 'Write the cover, the three spine fields and the back, with Side A and Side B in two columns. Add extra panels when the tracklist needs more room.' },
      { title: 'Style it', body: 'Pick a background color or image, choose from nine built-in fonts, or upload up to three of your own.' },
      { title: 'Export and print', body: 'Export a PDF for A4, US Letter or a custom page with crop marks and fold guides, then print it at 100% scale.' },
    ],
    faqs: [
      { q: 'What size is a cassette J-card?', a: 'The card is 102 mm (about 4 in) tall. The front panel is 65 mm wide, the spine 12.7 mm (half an inch) and the back flap 25.4 mm, or 10 mm for a short back. Extra inside panels add roughly 62 mm each.' },
      { q: 'What paper should I print it on?', a: 'Any paper works. Card stock between 160 and 250 g/m² folds cleanly and stands up best in the case. If your paper is thin and you can\'t print double-sided, print the outside and the inside on separate sheets and glue them back to back for a sturdier card. Print a single page first and measure the 50 mm scale bar on it to check your printer kept the size.' },
      { q: 'Do I need design software?', a: 'No. Everything runs in your browser. The designer works best on a laptop or desktop screen, where the card and its settings fit side by side.' },
    ],
    other: { to: '/mixtape', label: 'Plan the tracklist first' },
  },
};

const content = computed(() => CONTENT[props.tool]);
</script>

<template>
  <section class="tool-about" :aria-labelledby="`tool-about-${tool}`">
    <div class="tool-about-inner">
      <div class="gd-eyebrow tool-about-eyebrow">{{ content.eyebrow }}</div>
      <h2 :id="`tool-about-${tool}`" class="gd-h2">{{ content.heading }}</h2>
      <p class="gd-p">{{ content.intro }}</p>

      <ol class="tool-about-steps">
        <li v-for="(s, i) in content.steps" :key="s.title" class="tool-about-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">{{ String(i + 1).padStart(2, '0') }}</div>
            <h3 class="gd-h3">{{ s.title }}</h3>
          </div>
          <p class="gd-p">{{ s.body }}</p>
        </li>
      </ol>

      <h2 class="gd-h2">Questions</h2>
      <div class="gd-faq-list">
        <details v-for="f in content.faqs" :key="f.q" class="gd-faq-item">
          <summary class="gd-faq-q">{{ f.q }}</summary>
          <p class="gd-faq-a">{{ f.a }}</p>
        </details>
      </div>

      <p class="gd-p">
        Want every button explained? Read the
        <NuxtLink to="/how-to/editor-and-designer">editor and designer guide</NuxtLink>,
        or browse <NuxtLink to="/explore">tapes and J-cards from the community</NuxtLink>.
      </p>
      <NuxtLink :to="content.other.to" class="lp-btn lp-btn-mustard gd-cta-btn">{{ content.other.label }} →</NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.tool-about {
  position: relative;
  z-index: 2;
  background: var(--color-paper);
  border-top: 3px solid var(--color-text);
}

.tool-about-inner {
  max-width: 820px;
  margin: 0 auto;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.tool-about-eyebrow {
  color: var(--color-primary);
  margin-bottom: -8px;
}

.tool-about-steps {
  list-style: none;
  margin: 8px 0 16px;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px 32px;
}

.tool-about-step {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 768px) {
  .tool-about-inner { padding: 36px 20px; }
  .tool-about-steps { grid-template-columns: 1fr; }
}
</style>
