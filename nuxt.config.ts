const SITE_URL = 'https://mixtape-maker.com'
const SITE_DESCRIPTION =
  'Build retro cassette mixtapes using Spotify search. Design custom J-cards, split tracks across Side A & B, and save your mixes to the cloud.'

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Mixtape Maker',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: 'MusicApplication',
      operatingSystem: 'Web',
      browserRequirements: 'Requires JavaScript',
      featureList: [
        'Spotify track search',
        'A/B side mixtape editor with cassette length limits',
        'Drag-and-drop track ordering',
        'J-card designer with print-ready PDF export',
        'Optional cloud save with sign-in',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@type': 'HowTo',
      name: 'How to make a cassette mixtape with Mixtape Maker',
      description: 'Build a tracklist, fine-tune the sequence, and design a print-ready J-card.',
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Build your tracklist',
          text: 'Search for songs using Spotify results and add them to Side A or Side B. Cassette length is calculated automatically.',
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Fine-tune the sequence',
          text: 'Rearrange tracks by dragging them. Balance both sides so neither ends with dead air.',
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Design your J-Card',
          text: 'Upload cover art, add your title and tracklist, style the spine, and export a print-ready PDF sized for a standard cassette case.',
        },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Mixtape Maker?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Mixtape Maker is a free web app for building cassette mixtapes with Spotify search and designing print-ready J-cards for cassette cases.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need to sign in?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No sign-in is required to use the editor. Sign in to save mixtapes and J-cards to the cloud and access them across devices.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I design a J-card without making a mixtape?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. The J-card designer works independently — you can create and export a J-card without building a mixtape first.',
          },
        },
      ],
    },
  ],
}

export default defineNuxtConfig({
  compatibilityDate: '2026-07-03',

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Mixtape Maker — Build Retro Cassette Mixtapes',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        { name: 'description', content: SITE_DESCRIPTION },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Mixtape Maker' },
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:url', content: SITE_URL },
        { property: 'og:title', content: 'Mixtape Maker: Build Retro Cassette Mixtapes' },
        { property: 'og:description', content: SITE_DESCRIPTION },
        { property: 'og:image', content: `${SITE_URL}/og-image.png` },
        { property: 'og:image:width', content: '3456' },
        { property: 'og:image:height', content: '1582' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Mixtape Maker — Build Retro Cassette Mixtapes' },
        { name: 'twitter:description', content: SITE_DESCRIPTION },
        { name: 'twitter:image', content: `${SITE_URL}/og-image.png` },
      ],
      link: [
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/favicon.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'canonical', href: SITE_URL },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        // App display font
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=VT323&display=swap' },
        // Curated card fonts
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Sans:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&family=Permanent+Marker&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Special+Elite&display=swap',
        },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(JSON_LD),
        },
      ],
    },
  },

  routeRules: {
    // Homepage is prerendered for crawlers (replaces the old prerender.mjs step).
    '/': { prerender: true },
    // Legacy redirects, kept from the old react-router config.
    '/editor': { redirect: '/mixtape' },
    '/cards': { redirect: '/library?tab=jcards' },
    // Everything else is client-rendered, matching the old SPA behavior.
    '/**': { ssr: false },
  },

  runtimeConfig: {
    // Server-only (never exposed to the browser).
    spotifyClientId: '',
    spotifyClientSecret: '',
    public: {
      // client_id is public in OAuth 2.0 PKCE, safe to expose
      spotifyClientId: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
    },
  },

  typescript: {
    strict: true,
  },
})
