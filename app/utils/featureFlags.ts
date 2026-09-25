import type { LocationQuery } from 'vue-router';

/**
 * The 3D cassette library at /library/3d. On for everyone since launch (Stage 8:
 * runtimeConfig.public.library3d defaults to true); NUXT_PUBLIC_LIBRARY3D=false
 * switches it off, and then ?3d=1 still opens it for a single visit.
 */
export function isLibrary3DEnabled(configValue: unknown, query: LocationQuery): boolean {
  return configValue === true || configValue === 'true' || query['3d'] === '1';
}
