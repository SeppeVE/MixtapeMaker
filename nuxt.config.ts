// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@vercel/analytics/nuxt', '@nuxt/ui'],

  // Flat component names (filename only, no directory prefix) to match the
  // original React component names: <NavBar>, <CassetteSVG>, <JCardView>, etc.
  components: [{ path: '~/components', pathPrefix: false }],

  // Hybrid rendering: prerender the homepage, SSR public pages for SEO,
  // client-only for the auth-gated app (isolates browser-only code).
  routeRules: {
    '/': { prerender: true },
    '/explore': { ssr: true },
    '/explore/**': { ssr: true },
    '/share/**': { ssr: true },
    '/mixtape': { ssr: false },
    '/library': { ssr: false },
    '/cards/**': { ssr: false },
    '/spotify-callback': { ssr: false },
    // Legacy redirects
    '/editor': { redirect: '/mixtape' },
    '/cards': { redirect: '/library?tab=jcards' },
  },

  css: ['~/assets/css/index.css'],

  runtimeConfig: {
    // Server-only secrets (read via process.env in server routes to keep
    // existing Vercel env var names SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET).
    public: {
      supabaseUrl: '',       // NUXT_PUBLIC_SUPABASE_URL
      supabaseAnonKey: '',   // NUXT_PUBLIC_SUPABASE_ANON_KEY
      spotifyClientId: '',   // NUXT_PUBLIC_SPOTIFY_CLIENT_ID
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Mixtape Maker — Build Retro Cassette Mixtapes',
      meta: [
        { charset: 'UTF-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        { name: 'description', content: 'Build retro cassette mixtapes using Spotify search. Design custom J-cards, split tracks across Side A & B, and save your mixes to the cloud.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Mixtape Maker' },
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:url', content: 'https://mixtape-maker.com' },
        { property: 'og:title', content: 'Mixtape Maker: Build Retro Cassette Mixtapes' },
        { property: 'og:description', content: 'Build retro cassette mixtapes using Spotify search. Design custom J-cards, split tracks across Side A & B, and save your mixes to the cloud.' },
        { property: 'og:image', content: 'https://mixtape-maker.com/og-image.png' },
        { property: 'og:image:width', content: '3456' },
        { property: 'og:image:height', content: '1582' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Mixtape Maker — Build Retro Cassette Mixtapes' },
        { name: 'twitter:description', content: 'Build retro cassette mixtapes using Spotify search. Design custom J-cards, split tracks across Side A & B, and save your mixes to the cloud.' },
        { name: 'twitter:image', content: 'https://mixtape-maker.com/og-image.png' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/android-chrome-192x192.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'canonical', href: 'https://mixtape-maker.com' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=VT323&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Sans:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&family=Permanent+Marker&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Special+Elite&display=swap' },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebApplication',
                name: 'Mixtape Maker',
                url: 'https://mixtape-maker.com',
                description: 'Build retro cassette mixtapes using Spotify search. Design custom J-cards, split tracks across Side A & B, and save your mixes to the cloud.',
                applicationCategory: 'MusicApplication',
                operatingSystem: 'Web',
                browserRequirements: 'Requires JavaScript',
                image: 'https://mixtape-maker.com/android-chrome-512x512.png',
                screenshot: 'https://mixtape-maker.com/og-image.png',
                featureList: [
                  'Spotify track search',
                  'A/B side mixtape editor with cassette length limits',
                  'Drag-and-drop track ordering',
                  'J-card designer with print-ready PDF export',
                  'Optional cloud save with sign-in',
                ],
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              },
              {
                '@type': 'Organization',
                name: 'Mixtape Maker',
                url: 'https://mixtape-maker.com',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://mixtape-maker.com/android-chrome-512x512.png',
                  width: 512,
                  height: 512,
                },
              },
            ],
          }),
        },
      ],
    },
  },

  typescript: { typeCheck: false },
})
