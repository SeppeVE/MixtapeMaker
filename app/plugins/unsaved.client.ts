import { defineNuxtPlugin } from '#app';
import type { Router } from 'vue-router';
import { useUnsavedStore } from '~/stores/unsaved';

// Guards against losing work that isn't in the cloud yet.
//  - In-app navigation: paused by the router guard and answered through the
//    styled <UnsavedChangesModal> in the default layout.
//  - Tab close / reload / external links: the browser only permits its own
//    native "Leave site?" dialog here, so that's what shows.
export default defineNuxtPlugin((nuxtApp) => {
  const unsaved = useUnsavedStore();
  const router = nuxtApp.$router as Router;

  router.beforeEach((to, from) => {
    // Same page, only query/hash changed (library tabs, anchors) — never a leave.
    if (to.path === from.path) return true;
    return unsaved.shouldAllow(to.fullPath, from.path);
  });

  window.addEventListener('beforeunload', (e) => {
    if (unsaved.dirtySources(window.location.pathname).length === 0) return;
    e.preventDefault();
    // Legacy browsers need a string; modern ones ignore it and show their own text.
    e.returnValue = '';
  });
});
