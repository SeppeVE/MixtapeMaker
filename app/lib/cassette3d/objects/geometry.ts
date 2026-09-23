import { BufferGeometry, ExtrudeGeometry, type Shape } from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

/** Smooth normals across curved segments, hard edges where faces meet at more than ~35°. */
const CREASE_ANGLE = (35 * Math.PI) / 180;

/**
 * Extrude a profile drawn in the case's XZ plane (shape x → X, shape y → Z) along Y,
 * centred on y = 0. Used for the long plastic parts (tray body, lid).
 */
export function extrudeAlongY(profile: Shape, length: number, curveSegments = 24): BufferGeometry {
  const geometry = new ExtrudeGeometry(profile, { depth: length, bevelEnabled: false, curveSegments });
  // Shape y → +Z, extrusion (+Z) → −Y; then centre on y = 0.
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, length / 2, 0);
  return crease(geometry);
}

/**
 * Extrude a profile drawn in the case's XZ plane along Y, occupying y ∈ [y0, y0 + thickness].
 * Used for the short end pieces (tray end walls, lid end tabs).
 */
export function extrudeSlabY(profile: Shape, y0: number, thickness: number, curveSegments = 24): BufferGeometry {
  const geometry = new ExtrudeGeometry(profile, { depth: thickness, bevelEnabled: false, curveSegments });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, y0 + thickness, 0);
  return crease(geometry);
}

/** Extrude a shape drawn in the XY plane along Z, occupying z ∈ [z0, z0 + depth]. */
export function extrudeZ(
  shape: Shape,
  z0: number,
  depth: number,
  options: { bevel?: number; curveSegments?: number } = {},
): BufferGeometry {
  const bevel = options.bevel ?? 0;
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(depth - 2 * bevel, 0.0001),
    curveSegments: options.curveSegments ?? 16,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    // Keep the outline where it was drawn; the bevel rounds inwards.
    bevelOffset: -bevel,
    bevelSegments: 2,
  });
  geometry.translate(0, 0, z0 + bevel);
  // Bevelled caps are single big polygons: smoothing them into the bevel would smear
  // shading across the whole face. The bevel is tiny, so flat normals look right.
  return bevel > 0 ? geometry : crease(geometry);
}

function crease(geometry: BufferGeometry): BufferGeometry {
  const creased = toCreasedNormals(geometry, CREASE_ANGLE);
  if (creased !== geometry) geometry.dispose();
  return creased;
}
