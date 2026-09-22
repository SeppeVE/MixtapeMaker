<script setup lang="ts">
import { useSeoMeta } from '#app';

// Plain-language privacy policy. Every claim in here mirrors what the code
// actually does — if a data flow changes (new provider, new field), update
// the matching section and bump LAST_UPDATED.
const LAST_UPDATED = '11 September 2026';
const CONTACT_EMAIL = 'contact@mixtape-maker.com';

useSeoMeta({
  title: 'Privacy Policy — Mixtape Maker',
  description: 'What Mixtape Maker collects, why, which services process it, and how to see, change or delete your data.',
  robots: 'index, follow',
});

const SECTIONS = [
  { id: 'who', label: 'Who we are' },
  { id: 'collect', label: 'What we collect' },
  { id: 'public', label: 'What is public' },
  { id: 'services', label: 'Services we use' },
  { id: 'browser', label: 'Data in your browser' },
  { id: 'retention', label: 'Retention & deletion' },
  { id: 'rights', label: 'Your rights' },
  { id: 'children', label: 'Children' },
  { id: 'changes', label: 'Changes' },
];

const PROVIDERS = [
  {
    name: 'Supabase',
    role: 'Database, sign-in and file storage',
    what: 'Your account, profile, mixtapes, J-cards, uploaded images and feedback are stored here. Supabase handles password hashing, email confirmation and login sessions.',
  },
  {
    name: 'Vercel',
    role: 'Hosting and analytics',
    what: 'Serves the website. Vercel Analytics counts page views without cookies; it records the page, referrer, country and device type, not who you are.',
  },
  {
    name: 'Spotify',
    role: 'Song search and playlist export',
    what: 'Search terms you type are forwarded to Spotify through our server. If you export a mixtape, you connect your own Spotify account; the access token is kept only in your browser and lets us create a playlist and set its cover image on your behalf.',
  },
  {
    name: 'Google',
    role: 'Optional sign-in',
    what: 'If you choose "Sign in with Google", Google tells us your email address and account id. We do not receive your contacts, calendar or anything else.',
  },
  {
    name: 'Cloudflare Turnstile',
    role: 'Bot protection on sign-up',
    what: 'A captcha that runs a Cloudflare script and sees your IP address and browser details to decide whether you are a human.',
  },
  {
    name: 'Sentry',
    role: 'Error monitoring',
    what: 'When something breaks, the error, the page you were on, your browser type and IP address are sent to Sentry so we can fix it. For sessions that hit an error, and a small sample of others, Sentry also records a replay of how the page was used: text is masked and images are blocked before anything leaves your browser, so we see layout and clicks, not what you typed or uploaded.',
  },
  {
    name: 'Buy Me a Coffee',
    role: 'Donation link',
    what: 'The button image in the footer is loaded from their servers, which see your IP address. Nothing is shared unless you click through and donate on their site.',
  },
];
</script>

<template>
  <div class="gd-page">
    <NavBar library>
      <NuxtLink to="/" class="lp-nav-link">◀ Home</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span style="font-family:var(--font-body);font-size:13px;color:var(--color-text)">Privacy</span>
    </NavBar>

    <header class="gd-header">
      <div class="gd-header-inner">
        <div class="gd-eyebrow">◆ PRIVACY POLICY</div>
        <h1 class="gd-title">How Mixtape Maker handles your data</h1>
        <p class="gd-subhead">
          Short version: we store what you need to sign in and save your work, we show only what you choose to make
          public, we don't sell or advertise with any of it, and you can delete everything yourself from your profile
          page. Last updated {{ LAST_UPDATED }}.
        </p>
      </div>
    </header>

    <div class="gd-body">
      <aside class="gd-toc">
        <div class="gd-toc-label">On this page</div>
        <a v-for="s in SECTIONS" :key="s.id" :href="`#${s.id}`" class="gd-toc-link">{{ s.label }}</a>
      </aside>

      <main class="gd-main">
        <section id="who" class="gd-section">
          <h2 class="gd-h2">Who we are</h2>
          <p class="gd-p">
            Mixtape Maker (mixtape-maker.com) is a hobby project run by a single developer based in Belgium. For anything
            about your data, email <a :href="`mailto:${CONTACT_EMAIL}`" class="pf-inline-link">{{ CONTACT_EMAIL }}</a>.
            Under the GDPR the developer is the "data controller" for the information described below.
          </p>
        </section>

        <section id="collect" class="gd-section">
          <h2 class="gd-h2">What we collect and why</h2>
          <p class="gd-p">
            You can use the mixtape editor and J-card designer without an account; then nothing is stored on our side
            and your work lives in your browser only (see "Data in your browser"). When you sign up we store:
          </p>
          <div class="gd-table-wrap">
            <table class="gd-table">
              <thead>
                <tr><th>Data</th><th>Why</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td class="gd-table-tape">Email address and a hashed password</td>
                  <td>To sign you in and send account emails such as confirmation or password reset. If you use Google sign-in we get your email and Google account id instead of a password.</td>
                </tr>
                <tr>
                  <td class="gd-table-tape">Profile: username, picture, bio, private setting</td>
                  <td>To show who made a mixtape and to give you a profile page. The username defaults to the part of your email before the @; you can change it.</td>
                </tr>
                <tr>
                  <td class="gd-table-tape">Mixtapes, J-cards and uploaded images</td>
                  <td>So you can save your work to the cloud and reach it from other devices. Song data (titles, artists, album art links) comes from Spotify.</td>
                </tr>
                <tr>
                  <td class="gd-table-tape">Feedback messages</td>
                  <td>If you use the Feedback button we keep your message, the page you sent it from and, only if you typed one, an email address to reply to. Signed-out visitors can send feedback anonymously.</td>
                </tr>
                <tr>
                  <td class="gd-table-tape">Which announcement you dismissed</td>
                  <td>So the "What's new" popup stops showing once you click "Don't show again".</td>
                </tr>
                <tr>
                  <td class="gd-table-tape">Support-prompt preferences</td>
                  <td>When the "Buy me a coffee" note was last shown, whether you muted it or the print checklist, and when you last clicked through — so we don't keep asking, on any of your devices. Nobody else can read these.</td>
                </tr>
                <tr>
                  <td class="gd-table-tape">Timestamps</td>
                  <td>When your account and items were created or last changed, used for sorting and for the "Joined" date on your profile.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="gd-p">
            We use this data only to run the site. We don't sell it, share it with advertisers, or build profiles of
            you for marketing. The legal basis is performing the service you asked for (your account) and our
            legitimate interest in keeping the site working and free of abuse (bot protection, rate limits, the
            language filter on public content).
          </p>
        </section>

        <section id="public" class="gd-section">
          <h2 class="gd-h2">What other people can see</h2>
          <p class="gd-p">
            Everything is private by default. Things become visible to anyone on the internet only when you choose:
          </p>
          <ul class="gd-list">
            <li>A mixtape you set to <strong>Public</strong> appears on the Explore page with your username next to it.</li>
            <li>A J-card you set to <strong>Public</strong> appears on your profile and on the page of the mixtape it is linked to.</li>
            <li>A mixtape you <strong>share by link</strong> is visible to anyone who has that link, even if it isn't public. Revoking the link stops that.</li>
            <li>Your <strong>profile page</strong> shows your username, picture, bio and public items. Set it to private on your profile page and visitors see only "This user has set their profile to private". Your username still appears next to public mixtapes.</li>
          </ul>
          <p class="gd-p">Your email address is never shown to other users.</p>
        </section>

        <section id="services" class="gd-section">
          <h2 class="gd-h2">Services that process data for us</h2>
          <p class="gd-p">
            We don't run our own servers. These companies process data on our behalf and are bound by their own
            privacy terms and by data-processing agreements with us:
          </p>
          <div class="pv-providers">
            <div v-for="p in PROVIDERS" :key="p.name" class="pv-provider">
              <div class="pv-provider-head">
                <span class="pv-provider-name">{{ p.name }}</span>
                <span class="pv-provider-role">{{ p.role }}</span>
              </div>
              <p class="pv-provider-body">{{ p.what }}</p>
            </div>
          </div>
          <p class="gd-p">
            Fonts are served from our own site, not from Google. Some of the providers above are based in the United
            States; where data leaves the EU it is covered by the EU-US Data Privacy Framework or standard contractual
            clauses.
          </p>
        </section>

        <section id="browser" class="gd-section">
          <h2 class="gd-h2">Data kept in your browser</h2>
          <p class="gd-p">
            The site stores some things in your browser's local storage so you don't lose work. None of it is used to
            track you across other sites, and we don't use advertising or tracking cookies, so there is no cookie banner.
          </p>
          <ul class="gd-list">
            <li>The mixtape and J-card you're currently working on, plus J-cards you haven't uploaded.</li>
            <li>Your login session token, so you stay signed in.</li>
            <li>Your Spotify access token if you connected Spotify for playlist export. It is never sent to our server.</li>
            <li>If you asked to copy a mixtape or J-card while signed out, which one it was — so the copy can finish once you sign in. It is discarded after 30 minutes, or as soon as the copy is made.</li>
            <li>Small flags such as "feedback sent recently", "notification closed in this tab" and, when signed out, whether you muted the "Buy me a coffee" note or the print checklist.</li>
          </ul>
          <p class="gd-p">Clearing your browser's site data removes all of it.</p>
        </section>

        <section id="retention" class="gd-section">
          <h2 class="gd-h2">How long we keep it, and how to delete it</h2>
          <p class="gd-p">
            Your account and everything in it is kept until you delete it. Feedback messages are kept until they've
            been read and acted on. Analytics are aggregated and hold no personal data. Error reports and session
            replays in Sentry are deleted automatically after 90 days.
          </p>
          <p class="gd-p">
            You can delete individual mixtapes and J-cards from your library at any time. To remove everything, open
            <NuxtLink to="/profile" class="pf-inline-link">your profile page</NuxtLink> and use <strong>Delete my
            account</strong>: this erases your account, profile, cloud mixtapes, J-cards and uploaded images
            immediately. Feedback you sent stays but is no longer linked to you. Anything saved only in your browser
            stays on your device until you clear it.
          </p>
        </section>

        <section id="rights" class="gd-section">
          <h2 class="gd-h2">Your rights</h2>
          <p class="gd-p">
            Under the GDPR you can ask to see the data we hold about you, correct it, have it deleted, receive a copy
            in a portable format, or object to how it's used. Most of that you can do yourself from your profile and
            library; for the rest, email <a :href="`mailto:${CONTACT_EMAIL}`" class="pf-inline-link">{{ CONTACT_EMAIL }}</a>
            and we'll respond within a month. If you're unhappy with how we've handled something you can complain to
            the Belgian Data Protection Authority (<a href="https://www.dataprotectionauthority.be" class="pf-inline-link" target="_blank" rel="noopener">dataprotectionauthority.be</a>)
            or your local supervisory authority.
          </p>
        </section>

        <section id="children" class="gd-section">
          <h2 class="gd-h2">Children</h2>
          <p class="gd-p">
            Mixtape Maker is not aimed at children. You must be at least 16, or the age at which you can consent to
            online services in your country, to create an account. If you think a child has made an account, email us
            and we'll remove it.
          </p>
        </section>

        <section id="changes" class="gd-section">
          <h2 class="gd-h2">Changes to this policy</h2>
          <p class="gd-p">
            If we add a feature that changes what we collect or who processes it, we'll update this page and the date
            at the top, and announce it through the site's "What's new" notification for signed-in users.
          </p>
        </section>
      </main>
    </div>

    <HomeFooter />
  </div>
</template>
