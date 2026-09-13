import * as Sentry from "@sentry/nuxt";
 
Sentry.init({
  dsn: "https://b1f4c1d386690ff7cff244486fa649a6@o4512079437299712.ingest.de.sentry.io/4512079441821776",

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
