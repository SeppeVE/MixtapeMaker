export const JCARD_HEIGHT_MM = 102;
export const BACK_FULL_MM   = 25.4;
export const BACK_SHORT_MM  = 10;
export const SPINE_MM       = 12.7;
export const FLAPS_MM       = [65, 63.5, 61.5, 61.5, 62, 63.5] as const;

export function computeWidthMm(content: { flaps: number; shortBack: boolean }): number {
  const back  = content.shortBack ? BACK_SHORT_MM : BACK_FULL_MM;
  const flaps = FLAPS_MM.slice(0, content.flaps).reduce((a, b) => a + b, 0);
  return back + SPINE_MM + flaps;
}
