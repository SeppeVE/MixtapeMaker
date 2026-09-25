/**
 * Quality tiers (Stage 7). A tier is picked at start from what the browser tells
 * us about the device (GPU name, pixel ratio, memory, cores, touch), and a short
 * frame-time probe can step it down once the scene runs. `?tier=high|mid|low`
 * forces one (and turns the probe off).
 *
 *   setting          high                 mid                 low
 *   case plastic     full transmission    physical, blended   plain transparent
 *   shadows          2048 map             1024 map            off
 *   contact shadows  on                   on                  off
 *   J-card texture   ≤ 4096 px            ≤ 2048 px           ≤ 1024 px
 *   pixel ratio      ≤ 2                  ≤ 1.5               1
 *   depth of field   on (desktop only)    off                 off
 *
 * Pure logic, no three.js: scene.ts and friends apply the settings.
 */

export type QualityTier = 'high' | 'mid' | 'low';
export const QUALITY_TIERS: readonly QualityTier[] = ['high', 'mid', 'low'];

/** How the hero case's plastic is drawn. */
export type PlasticMode = 'transmission' | 'blended' | 'plain';

export interface QualitySettings {
  tier: QualityTier;
  plastic: PlasticMode;
  /** Key light shadow map size; 0 = no shadows. */
  shadowMapSize: number;
  contactShadows: boolean;
  /** Longest side of a J-card face texture, px (the GPU's own limit still applies). */
  jcardMaxPx: number;
  pixelRatioCap: number;
  dof: boolean;
}

export const TIER_SETTINGS: Record<QualityTier, QualitySettings> = {
  high: { tier: 'high', plastic: 'transmission', shadowMapSize: 2048, contactShadows: true, jcardMaxPx: 4096, pixelRatioCap: 2, dof: true },
  mid: { tier: 'mid', plastic: 'blended', shadowMapSize: 1024, contactShadows: true, jcardMaxPx: 2048, pixelRatioCap: 1.5, dof: false },
  low: { tier: 'low', plastic: 'plain', shadowMapSize: 0, contactShadows: false, jcardMaxPx: 1024, pixelRatioCap: 1, dof: false },
};

export function isQualityTier(value: unknown): value is QualityTier {
  return typeof value === 'string' && (QUALITY_TIERS as readonly string[]).includes(value);
}

export const lowerTier = (tier: QualityTier): QualityTier => (tier === 'high' ? 'mid' : 'low');

/** What detection saw, for the debug hook and the checkpoint notes. */
export interface DeviceInfo {
  gpu: string | null;
  devicePixelRatio: number;
  /** navigator.deviceMemory (GB; Chromium only). */
  memoryGb: number | null;
  cores: number | null;
  /** Touch-first device (coarse pointer, no hover). */
  mobile: boolean;
}

export interface TierChoice {
  tier: QualityTier;
  /** Why: each rule that capped the tier, in order. */
  reasons: string[];
}

/** Software renderers: no GPU at all. */
const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;
/** Old or weak mobile GPUs. */
const WEAK_GPU = /mali-(4|t6|t7|g31|g51|g52)|adreno \(tm\) ?[2-5]\d\d|adreno [2-5]\d\d|powervr sgx|powervr rogue g6|videocore|intel.*gma/i;
/** Older integrated laptop graphics: fine without the transmission pass. */
const MODEST_GPU = /intel.*hd graphics( [2-6]\d{2,3})?\b/i;

export function chooseTier(device: DeviceInfo): TierChoice {
  const reasons: string[] = [];
  let tier: QualityTier = 'high';
  const cap = (to: QualityTier, why: string) => {
    if (QUALITY_TIERS.indexOf(to) > QUALITY_TIERS.indexOf(tier)) tier = to;
    reasons.push(why);
  };
  const gpu = device.gpu ?? '';
  if (SOFTWARE_GPU.test(gpu)) cap('low', `software renderer (${gpu})`);
  else if (WEAK_GPU.test(gpu)) cap('low', `weak GPU (${gpu})`);
  else if (MODEST_GPU.test(gpu)) cap('mid', `older integrated GPU (${gpu})`);
  if (device.memoryGb !== null && device.memoryGb <= 2) cap('low', `${device.memoryGb} GB memory`);
  else if (device.memoryGb !== null && device.memoryGb <= 4) cap('mid', `${device.memoryGb} GB memory`);
  if (device.cores !== null && device.cores <= 2) cap('low', `${device.cores} CPU cores`);
  // Phones and tablets: transmission and DOF at a pixel ratio of 3 is a lot of fill.
  if (device.mobile) cap('mid', 'touch device');
  if (!reasons.length) reasons.push('no limits found');
  return { tier, reasons };
}

/** Read what the browser tells us. `gl` is any WebGL context (the GPU name comes from it). */
export function readDevice(gl: WebGLRenderingContext | WebGL2RenderingContext | null): DeviceInfo {
  let gpu: string | null = null;
  if (gl) {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '') || null;
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches
    && !window.matchMedia('(hover: hover)').matches;
  return {
    gpu,
    devicePixelRatio: window.devicePixelRatio || 1,
    memoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    cores: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    mobile: coarse,
  };
}

/**
 * Frame-time probe: after a warm-up (shader compiles, texture uploads), the
 * median frame interval over a short window. Slower than `slowMs` steps the tier
 * down; the probe then runs once more on the new tier. Windows are timed, not
 * counted, so a device managing 2 fps doesn't wait a minute to be helped. Only
 * frames while the tab is visible count (the render loop pauses otherwise).
 */
export const PROBE = { warmupMs: 1500, sampleMs: 2500, minFrames: 5, maxFrames: 90, slowMs: 40, maxSteps: 2 };

export interface ProbeResult {
  tier: QualityTier;
  medianMs: number;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}
