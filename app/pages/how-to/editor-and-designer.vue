<script setup lang="ts">
import { useSeoMeta, useHead } from '#app';
import IconSparkle from '~icons/material-symbols/auto-awesome-rounded';

const SEO_TITLE = 'How to use the mixtape editor and J-card designer — Mixtape Maker';
const SEO_DESCRIPTION = 'A walkthrough of Mixtape Maker: build a two-sided tracklist from Spotify search, fit it to your tape length, save and share it, export it as a Spotify playlist, then design and print a matching cassette J-card.';

useSeoMeta({
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  ogTitle: SEO_TITLE,
  ogDescription: SEO_DESCRIPTION,
});

const TAPE_LENGTHS = [
  { tape: 'C30', per: '15 min' },
  { tape: 'C45', per: '22.5 min' },
  { tape: 'C60', per: '30 min' },
  { tape: 'C90', per: '45 min' },
  { tape: 'C100', per: '50 min' },
  { tape: 'C120', per: '60 min' },
];

const DECK_CONTROLS = [
  { title: 'Drag a track', body: 'Reorders it within the side.' },
  { title: 'A → / B →', body: 'Moves the track to the end of the other side.' },
  { title: '×', body: 'Removes the track from the tape.' },
  { title: '⤨ Shuffle', body: 'Shuffles the side you are looking at. The other side stays as it is.' },
  { title: '↻ Flip', body: 'Switches the deck between Side A and Side B. Clicking the "Side A / Side B" label does the same.' },
];

const SAVE_ACTIONS = [
  { title: 'Save to cloud', body: 'Stores the tape in your account so it shows up in your Library on any device. Needs a sign-in and a title.' },
  { title: 'Make public', body: 'Lists the tape on Explore and your profile. Save it to the cloud first. An unedited copy of someone else\'s tape stays private until you change it.' },
  { title: 'Create j-card', body: 'Opens the designer with a new card already filled in from this tape.' },
  { title: 'Export to Spotify', body: 'Link your Spotify account once, then create one playlist or separate Side A and Side B playlists. Tracks Spotify can\'t find are skipped and counted.' },
  { title: 'New Mixtape', body: 'Starts an empty tape. Save the current one first if you want to keep it.' },
];

const PRESETS = ['Vaporwave', 'Kraft Minimal', 'Punk Zine', 'Vintage', 'Monochrome'];

const PANELS = [
  { title: 'Panel content', body: 'Text for the cover and each extra panel, outside and inside. Pick a panel, then type. Shift + Enter adds a new line.' },
  { title: 'Spine', body: 'Top, center and bottom fields on the outside, plus one field on the inside.' },
  { title: 'Back panel', body: 'Left column for Side A, right column for Side B, and a field for the inside of the back.' },
  { title: 'Background color and image', body: 'A swatch or a custom color for the whole card, and an optional image for the outside and the inside.' },
  { title: 'Custom fonts', body: 'Nine fonts are built in. Upload up to three of your own as .woff2, .otf or .ttf.' },
];

const PRINT_CHECKS = [
  { title: 'Scale 100%', body: 'Print at actual size. Never "fit to page" or "shrink to printable area".' },
  { title: 'Measure the 50 mm bar', body: 'Print page 1 alone first and check the bar under the card with a ruler before printing a full run.' },
  { title: 'Card stock', body: '160–250 g/m² folds cleanly and stands up in the case.' },
  { title: 'Cut and fold', body: 'Cut on the crop marks, fold on the dashed guides.' },
];

const FAQS = [
  {
    q: 'Do I need an account?',
    a: 'No. You can build a tape and design a J-card without signing in, and your work stays in this browser. Sign in to save to the cloud, open your tapes on another device, or make them public.',
  },
  {
    q: 'Do I need a Spotify account to search?',
    a: 'No. Search works without linking anything. You only connect Spotify when you want to export a tape as a playlist.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'The mixtape editor works on a phone. The J-card designer is built for a desktop or laptop screen, where you can see the card and the settings side by side.',
  },
  {
    q: 'I changed the tape after making the J-card. How do I update the tracklist?',
    a: 'Save the tape, open the card, and in the Tracklist section press "Pull tracks from mixtape". The spine and back panel are rewritten from the tape\'s current tracks.',
  },
];

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'How to make a mixtape and J-card with Mixtape Maker',
        description: SEO_DESCRIPTION,
        step: [
          { '@type': 'HowToStep', name: 'Name the tape and pick its length', text: 'Open the editor, click the title to rename it, and choose a tape length from C30 to C120 in the Preview panel.' },
          { '@type': 'HowToStep', name: 'Search Spotify and add tracks', text: 'Search for a song or artist and press A or B on a result to add it to that side.' },
          { '@type': 'HowToStep', name: 'Arrange both sides', text: 'Drag to reorder, move tracks between sides, shuffle or remove them until each side fits the tape length.' },
          { '@type': 'HowToStep', name: 'Save, share and export', text: 'Save to the cloud, make the tape public, or export it to Spotify as one playlist or one per side.' },
          { '@type': 'HowToStep', name: 'Open the J-card designer', text: 'Press "Create j-card" to start a card filled in from the tape, or start from a preset.' },
          { '@type': 'HowToStep', name: 'Design the card', text: 'Set the number of panels, then edit the cover, spine, back panel, background and fonts.' },
          { '@type': 'HowToStep', name: 'Export and print', text: 'Choose A4, US Letter or a custom page, export the PDF and print it at 100% on card stock.' },
        ],
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }),
    },
  ],
});
</script>

<template>
  <div class="gd-page">
    <NavBar library>
      <NuxtLink to="/" class="lp-nav-link">◀ Home</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span class="lp-nav-current">How-to guide</span>
    </NavBar>

    <header class="gd-header">
      <div class="gd-header-inner">
        <GuideSwitch />
        <div class="gd-eyebrow">◆ HOW-TO GUIDE</div>
        <h1 class="gd-title">How to use the mixtape editor and J-card designer</h1>
        <p class="gd-subhead">
          Build a two-sided tracklist from Spotify search, fit it to your tape, and design a J-card to go with it.
          Once it's done, the <NuxtLink to="/how-to">recording guide</NuxtLink> takes it onto a real cassette.
        </p>
        <nav class="gd-tabs" aria-label="Guide sections">
          <a href="#editor" class="gd-tab">01 Editor</a>
          <a href="#designer" class="gd-tab">02 Designer</a>
          <a href="#faq" class="gd-tab">FAQ</a>
        </nav>
      </div>
    </header>

    <div class="gd-body">
      <aside class="gd-toc">
        <div class="gd-toc-label">On this page</div>
        <a href="#editor" class="gd-toc-link">01 The mixtape editor</a>
        <a href="#designer" class="gd-toc-link">02 The J-card designer</a>
        <a href="#faq" class="gd-toc-link">? Questions people ask</a>
      </aside>

      <main class="gd-main">
        <!-- ── PART ONE ── -->
        <div id="editor" class="gd-part gd-part--mustard">
          <div class="gd-part-number">01</div>
          <div>
            <div class="gd-part-label">Part one</div>
            <div class="gd-part-title">The mixtape editor</div>
          </div>
        </div>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">01</div>
            <h3 class="gd-h3">Name the tape and pick its length</h3>
          </div>
          <p class="gd-p">
            Open the editor and click the title in the top bar, or the title row in the <strong>Preview</strong> panel,
            to rename the tape. The <strong>For</strong> row is for a dedication. Then choose the
            <strong>Length</strong>. Every side is checked against it, so set it before you add songs.
          </p>
          <div class="gd-table-wrap">
            <table class="gd-table">
              <thead>
                <tr><th>Tape</th><th>Per side</th></tr>
              </thead>
              <tbody>
                <tr v-for="t in TAPE_LENGTHS" :key="t.tape">
                  <td class="gd-table-tape">{{ t.tape }}</td>
                  <td>{{ t.per }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <NuxtLink to="/mixtape" class="lp-btn lp-btn-mustard gd-cta-btn">Open the editor →</NuxtLink>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">02</div>
            <h3 class="gd-h3">Search Spotify and add tracks</h3>
          </div>
          <p class="gd-p">
            Type a song or artist into the search panel and press <strong>A</strong> or <strong>B</strong> on a result
            to add it to that side. A check mark shows a track is already on a side. Your recent searches appear
            as chips under the search box, so you can rerun one with a click.
          </p>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">03</div>
            <h3 class="gd-h3">Arrange both sides</h3>
          </div>
          <p class="gd-p">
            The deck in the middle shows one side at a time. Its header shows the track count and running time,
            and a warning with the overrun (for example <strong>+1:20</strong>) appears when the side is longer than the tape allows.
            The Preview panel shows both sides at once, with a colored dot for each.
          </p>
          <ul class="gd-checklist">
            <li v-for="c in DECK_CONTROLS" :key="c.title" class="gd-checklist-item">
              <span class="gd-checklist-mark">◉</span>
              <span><strong>{{ c.title }}</strong> — {{ c.body }}</span>
            </li>
          </ul>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">04</div>
            <h3 class="gd-h3">Save, share and export</h3>
          </div>
          <p class="gd-p">
            Everything you do is kept in this browser as you go. The <strong>Actions</strong> panel takes it further:
          </p>
          <ul class="gd-checklist">
            <li v-for="c in SAVE_ACTIONS" :key="c.title" class="gd-checklist-item">
              <span class="gd-checklist-mark">◉</span>
              <span><strong>{{ c.title }}</strong> — {{ c.body }}</span>
            </li>
          </ul>
          <p class="gd-caption">
            Saved tapes live in your <NuxtLink to="/library">Library</NuxtLink>, where you can reopen them or get a
            private share link.
          </p>
        </section>

        <!-- ── PART TWO ── -->
        <div id="designer" class="gd-part gd-part--plum">
          <div class="gd-part-number">02</div>
          <div>
            <div class="gd-part-label">Part two</div>
            <div class="gd-part-title">The J-card designer</div>
          </div>
        </div>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">05</div>
            <h3 class="gd-h3">Open the designer</h3>
          </div>
          <p class="gd-p">
            Press <strong>Create j-card</strong> in the editor, or <strong>+ New Card</strong> in your Library. The new card
            starts filled in from the tape that's open in the editor: its title on the cover and spine, the tape length on the spine,
            and the Side A and Side B tracks on the back. The outside and inside of the card are previewed side by side and update as you edit.
            Undo and redo are at the top (⌘Z / ⌘⇧Z).
          </p>
          <p class="gd-p">
            Want a quick look first? Open <strong>Basic presets</strong> and pick one:
            {{ PRESETS.join(', ') }}. A preset replaces your current design, so press Undo if you change your mind.
          </p>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">06</div>
            <h3 class="gd-h3">Set the panel layout</h3>
          </div>
          <p class="gd-p">
            In <strong>Panel layout</strong>, the slider sets the number of panels (1–6): the cover plus the panels that fold out
            behind it. <strong>Reverse card</strong> mirrors it left to right, and <strong>Short back panel</strong> makes the back
            10 mm. If the card grows wider than your paper, the designer tells you and the PDF uses a custom page size instead.
          </p>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">07</div>
            <h3 class="gd-h3">Fill in the card</h3>
          </div>
          <p class="gd-p">Each part of the card has its own section in the settings column:</p>
          <ul class="gd-checklist">
            <li v-for="c in PANELS" :key="c.title" class="gd-checklist-item">
              <span class="gd-checklist-mark">◉</span>
              <span><strong>{{ c.title }}</strong> — {{ c.body }}</span>
            </li>
          </ul>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">08</div>
            <h3 class="gd-h3">Link the tracklist</h3>
          </div>
          <p class="gd-p">
            In <strong>Tracklist</strong>, pick one of your saved tapes and press <strong>Pull tracks from mixtape</strong>.
            The spine and both back columns are rewritten from the tape. Tick <strong>Include track duration</strong> to
            add running times. Pull again whenever you change the tape.
          </p>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">09</div>
            <h3 class="gd-h3">Export and print</h3>
          </div>
          <p class="gd-p">
            In <strong>Export</strong>, choose A4, US Letter or <strong>Fit to card</strong>. You can turn on fold and cut guides,
            add 3 mm of bleed so an off cut shows no white edge, and include the inside as page 2 for two-sided printing.
            For two-sided, match the flip edge (long or short) to your printer's setting. Then press <strong>Export PDF</strong>.
          </p>
          <ul class="gd-checklist">
            <li v-for="c in PRINT_CHECKS" :key="c.title" class="gd-checklist-item">
              <span class="gd-checklist-mark">◉</span>
              <span><strong>{{ c.title }}</strong> — {{ c.body }}</span>
            </li>
          </ul>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">10</div>
            <h3 class="gd-h3">Save and share the card</h3>
          </div>
          <p class="gd-p">
            Press <strong>Save</strong> to keep the card in your account (sign-in needed), and <strong>Make public</strong> to
            show it on Explore and next to the tape it belongs to. The card's title is set in <strong>Card info</strong>.
          </p>
          <NuxtLink to="/cards/designer" class="lp-btn lp-btn-mustard gd-cta-btn">
            <IconSparkle class="icon-inline" aria-hidden="true" /> Open J-Card designer
          </NuxtLink>
        </section>

        <!-- ── FAQ ── -->
        <section id="faq" class="gd-section">
          <h2 class="gd-h2">Questions people ask</h2>
          <div class="gd-faq-list">
            <details v-for="f in FAQS" :key="f.q" class="gd-faq-item">
              <summary class="gd-faq-q">{{ f.q }}</summary>
              <p class="gd-faq-a">{{ f.a }}</p>
            </details>
          </div>
        </section>

        <div class="gd-next">
          <div>
            <div class="gd-next-label">NEXT GUIDE</div>
            <div class="gd-next-title">Record it onto a cassette</div>
          </div>
          <NuxtLink to="/how-to" class="lp-btn lp-btn-mustard">Read it →</NuxtLink>
        </div>
      </main>
    </div>

    <HomeFooter />
  </div>
</template>
