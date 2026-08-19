<script setup lang="ts">
import { useSeoMeta, useHead } from '#app';

useSeoMeta({
  title: 'How to record a Spotify mixtape onto a cassette — Mixtape Maker',
  description: 'Make a mixtape of your desired songs in Mixtape Maker, and record it onto a cassette. Connect a Spotify player device (laptop or phone usually) to your receiver and into your cassette deck. A full walkthrough: pick a tape length, balance both sides, wire up the deck, set levels, and record clean.',
});

const TAPE_LENGTHS = [
  { tape: 'C-46', per: '23 min', good: 'A tight 10-track set' },
  { tape: 'C-60', per: '30 min', good: 'The classic mixtape' },
  { tape: 'C-90', per: '45 min', good: 'Long drives, full albums' },
];

const CHECKS = [
  { title: 'Notifications silenced', body: 'Do Not Disturb, system sounds off. The deck records everything.' },
  { title: 'Playlist in the right order', body: 'Queue Side A only, top to bottom, repeat and shuffle off. Maybe set a timer on your phone for ~2-3 minutes befor the end of the recording so you can stop the tape right when it is done.' },
  { title: 'Tape past the leader', body: 'The first two seconds of a cassette record nothing at all.' },
  { title: 'Spotify private session', body: 'This is mostly if you are making tapes for friends and don\'t want their music in your algorithm.' },
];

const FAQS = [
  {
    q: 'Can I record without playing it in real time?',
    a: 'No, a cassette deck only captures what’s playing through LINE IN as it happens, so a C-60 always takes a full hour to fill both sides. Mixtape Maker plans the running order and prints the J-card, but the recording pass itself can’t be skipped or sped up.',
  },
  {
    q: 'Which blank tape should I buy?',
    a: 'Any Type 1 blank like a TDK60 or 90 (or other brands) work fine and are not too hard to find. Chrome Type 2 tapes are better but also harder to find. Even pre-recorded tape are perfectly fine to use if they still work and are not moldy.',
  },
  {
    q: 'Do I need Spotify Premium?',
    a: 'Free works for playback, but Premium makes the recording pass easier: free accounts can’t always play an exact queue on demand on mobile, and free playback has occasional ads which end up onto your tape if you don\'t pause the recording.',
  },
];

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'How to record a Spotify mixtape onto a cassette',
        description: 'Sequence a tracklist in Mixtape Maker, then run one cable from a phone into a tape deck to record it in real time.',
        step: [
          { '@type': 'HowToStep', name: 'Pick your tape length first', text: 'Set the tape length (C-46, C-60, or C-90) before adding songs so the editor can track exactly how much room is left on each side.' },
          { '@type': 'HowToStep', name: 'Search Spotify, add to the tape', text: 'Search for a song or artist and add results to Side A or Side B. Each track carries its real running time.' },
          { '@type': 'HowToStep', name: 'Balance the two sides', text: 'Reorder tracks and move overflow to Side B. A little overage is fine — most tapes run a bit long — but aim to fill each side to its full length.' },
          { '@type': 'HowToStep', name: 'Plug your phone into the deck', text: 'If you have a full cassette deck hooked up to an amp/receiver, plug your player’s aux out into the amp’s aux in or line in, then select that source on the amp.' },
          { '@type': 'HowToStep', name: 'Set the level once, then leave it', text: 'Play the loudest song in the mix and set the deck’s record level so peaks kiss 0 dB without pinning red.' },
          { '@type': 'HowToStep', name: 'Press record, then press play', text: 'Start the deck first, wait two seconds for the leader tape to pass, then start the music.' },
          { '@type': 'HowToStep', name: 'Flip the tape, repeat for Side B', text: 'Stop the deck, flip the cassette, switch to Side B in the editor, and repeat the same level and routine.' },
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
      <span style="font-family:var(--font-body);font-size:13px;color:var(--color-text)">How-to guide</span>
    </NavBar>

    <header class="gd-header">
      <div class="gd-header-inner">
        <div class="gd-eyebrow">◆ HOW-TO GUIDE</div>
        <h1 class="gd-title">How to record a Spotify mixtape onto a cassette</h1>
        <p class="gd-subhead">
          Make a mixtape of your desired songs in Mixtape Maker, and record it onto a cassette. Connect a Spotify player device (laptop or phone usually) to your receiver and into your cassette deck.
        </p>
        <nav class="gd-tabs" aria-label="Guide sections">
          <a href="#make-it" class="gd-tab">01 Make it</a>
          <a href="#record-it" class="gd-tab">02 Record it</a>
          <a href="#faq" class="gd-tab">FAQ</a>
        </nav>
      </div>
    </header>

    <div class="gd-body">
      <aside class="gd-toc">
        <div class="gd-toc-label">On this page</div>
        <a href="#make-it" class="gd-toc-link">01 Make the mixtape</a>
        <a href="#record-it" class="gd-toc-link">02 Record it to tape</a>
        <a href="#faq" class="gd-toc-link">? Questions people ask</a>
      </aside>

      <main class="gd-main">
        <!-- ── PART ONE ── -->
        <div id="make-it" class="gd-part gd-part--mustard">
          <div class="gd-part-number">01</div>
          <div>
            <div class="gd-part-label">Part one</div>
            <div class="gd-part-title">Make the mixtape</div>
          </div>
        </div>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">01</div>
            <h3 class="gd-h3">Pick your tape length first</h3>
          </div>
          <p class="gd-p">
            The length of your tape is your constraint. Set it before you add songs and the editor will tell you exactly how
            much room is left on each side, so you never discover the problem halfway through recording.
          </p>
          <div class="gd-table-wrap">
            <table class="gd-table">
              <thead>
                <tr><th>Tape</th><th>Per side</th><th>Good for</th></tr>
              </thead>
              <tbody>
                <tr v-for="t in TAPE_LENGTHS" :key="t.tape">
                  <td class="gd-table-tape">{{ t.tape }}</td>
                  <td>{{ t.per }}</td>
                  <td>{{ t.good }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">02</div>
            <h3 class="gd-h3">Search Spotify, add to the tape</h3>
          </div>
          <p class="gd-p">
            Type a song or artist into the search panel and hit <strong>+ A</strong> or <strong>+ B</strong>
            on the result. Add your songs to the desired side of the tape.
          </p>
          <div class="lp-mock-window lp-shadow">
            <div class="mock-title-bar">
              <span>⌕ SEARCH SPOTIFY</span>
              <div class="mock-spacer" />
              <span class="mock-nav-breadcrumb">4 RESULTS</span>
            </div>
            <div class="mock-song-list">
              <div class="mock-song-item gd-search-row">
                <div class="mock-song-content">
                  <div class="mock-song-title">Dreams</div>
                  <div class="mock-song-artist">Fleetwood Mac · 4:14</div>
                </div>
                <button type="button" class="gd-add-btn">+ A</button>
                <button type="button" class="gd-add-btn">+ B</button>
              </div>
              <div class="mock-song-item gd-search-row">
                <div class="mock-song-content">
                  <div class="mock-song-title">The Chain</div>
                  <div class="mock-song-artist">Fleetwood Mac · 4:30</div>
                </div>
                <button type="button" class="gd-add-btn">+ A</button>
                <button type="button" class="gd-add-btn">+ B</button>
              </div>
              <div class="mock-song-item gd-search-row">
                <div class="mock-song-content">
                  <div class="mock-song-title">Everywhere</div>
                  <div class="mock-song-artist">Fleetwood Mac · 3:47</div>
                </div>
                <button type="button" class="gd-add-btn">+ A</button>
                <button type="button" class="gd-add-btn">+ B</button>
              </div>
            </div>
          </div>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">03</div>
            <h3 class="gd-h3">Balance the two sides</h3>
          </div>
          <p class="gd-p">
            Drag tracks to reorder, and move anything that overflows to Side B. Tapes usually have a little extra room, so if you have 30 minutes and 10 seconds on a C-60 side, you should be fine. But try to aim for 30.
          </p>
          <div class="lp-mock-window lp-shadow gd-meter-window">
            <div class="mock-side-header">
              <span class="mock-side-title">◀ SIDE A</span>
              <span class="mock-time-display">17:21 / 30:00</span>
            </div>
            <div class="mock-tape-footer">
              <div class="mock-tape-stats">
                <span class="mock-tape-used">17:21 used</span>
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
          <p class="gd-caption">
            Green means it fits. When the meter turns plum you are over the side length — drop a track or
            move it to Side B.
          </p>
        </section>

        <!-- <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">04</div>
            <h3 class="gd-h3">Print the J-card while you are here</h3>
          </div>
          <p class="gd-p">
            Do this before you record — the tracklist is fresh and you will have something to hold while
            the tape rolls. Export the PDF, print at 100% ("no fit to page"), cut, fold on the score lines.
          </p>
          <NuxtLink to="/cards/designer" class="lp-btn lp-btn-mustard gd-cta-btn">
            ✦ Open J-Card designer
          </NuxtLink>
          <p class="gd-caption">Prints at exact cassette-case size.</p>
        </section> -->

        <!-- ── PART TWO ── -->
        <div id="record-it" class="gd-part gd-part--plum">
          <div class="gd-part-number">02</div>
          <div>
            <div class="gd-part-label">Part two</div>
            <div class="gd-part-title">Record it to tape</div>
          </div>
        </div>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">04</div>
            <h3 class="gd-h3">Plug your phone into the deck</h3>
          </div>
          <p class="gd-p">
            If you have an actual cassette deck, not a small (often mono) recorder, it should be hooked up to an amp/receiver. In that case you would plug your recording device aux out into the aux in or line in on the amp. Then select the correct source to play on the amp, start Spotify, and you should be able to start recording your tape.
          </p>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">05</div>
            <h3 class="gd-h3">Set the level once, then leave it</h3>
          </div>
          <p class="gd-p">
            Set your player device at about three-quarters volume, press REC PAUSE on the deck, and play the loudest
            song in the mix. Turn the deck's record level until the needles or LEDs average around 0 dB. Depending on the tape type being I, II or IV, the peaks can go to +2, +5 or +8 dB.
          </p>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">06</div>
            <h3 class="gd-h3">Press record, then press play</h3>
          </div>
          <p class="gd-p">
            Start the deck first so the leader tape is past the head, wait two seconds, then start the
            music. Here are a couple of tips I find useful.
          </p>
          <ul class="gd-checklist">
            <li v-for="c in CHECKS" :key="c.title" class="gd-checklist-item">
              <span class="gd-checklist-mark">◉</span>
              <span><strong>{{ c.title }}</strong> — {{ c.body }}</span>
            </li>
          </ul>
        </section>

        <section class="gd-section gd-step">
          <div class="gd-step-head">
            <div class="gd-step-badge">07</div>
            <h3 class="gd-h3">Flip the tape, repeat for Side B</h3>
          </div>
          <p class="gd-p">
            When Side A's last track ends, stop the deck, flip the cassette, and switch to Side B in the
            editor so the running order stays in front of you. Same level, same routine. Give it a quick listen, start, middle and finish so that the recording went through fully.
            Then put it in the case along with your custom J-Card and add it to your collection or give it to a friend or loved one.
          </p>
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
      </main>
    </div>

    <HomeFooter />
  </div>
</template>
