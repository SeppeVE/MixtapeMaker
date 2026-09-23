import type { LocationQuery } from 'vue-router';

/**
 * The 3D cassette library at /library/3d. On when NUXT_PUBLIC_LIBRARY3D=true,
 * or for a single visit with ?3d=1 in the URL.
 */
export function isLibrary3DEnabled(configValue: unknown, query: LocationQuery): boolean {
  return configValue === true || configValue === 'true' || query['3d'] === '1';
}
