import { CASE, SHELF } from '../dimensions';

/**
 * Where every case stands on the shelf. Pure numbers, no three.js.
 *
 * Fill order is bay by bay, and within a bay top row first, left to right, like
 * reading a bookcase. Larger libraries don't grow taller: they add bays to the
 * right, and the shelf camera pans sideways (see shelfView.ts).
 */

export interface ShelfSlot {
  /** Case centre, world cm. The case stands on its short end with its spine towards +Z. */
  x: number;
  y: number;
  z: number;
  bay: number;
  row: number;
}

export interface ShelfLayout {
  slots: ShelfSlot[];
  bays: number;
  perRow: number;
  perBay: number;
  /** Outer bounds of the whole bookcase. */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  /** Centre of each bay (x). */
  bayCentres: number[];
  /** Y of each row's floor (top of the board the cases stand on), top row first. */
  rowFloors: number[];
}

export const SHELF_PITCH = CASE.depth + SHELF.gap;
export const SHELF_PER_ROW = Math.floor((SHELF.bayWidth - SHELF.gap) / SHELF_PITCH);
export const SHELF_HEIGHT = SHELF.plinth + SHELF.rows * (SHELF.board + SHELF.rowClearance) + SHELF.board;
/** Case centre z: the spine face sits `inset` behind the boards' front edge. */
export const SHELF_CASE_Z = SHELF.frontZ - SHELF.inset - CASE.width / 2;

/** X of bay `b`'s left inside edge. Bay 0 is centred on x = 0, behind the turntable. */
export function bayLeft(b: number): number {
  return -SHELF.bayWidth / 2 + b * (SHELF.bayWidth + SHELF.side);
}

export function rowFloor(row: number): number {
  return SHELF.plinth + SHELF.board + (SHELF.rows - 1 - row) * (SHELF.board + SHELF.rowClearance);
}

export function computeShelfLayout(count: number): ShelfLayout {
  const perRow = SHELF_PER_ROW;
  const perBay = perRow * SHELF.rows;
  const bays = Math.max(1, Math.ceil(count / perBay));
  // Spare space in a row is split evenly at both ends.
  const rowSlack = SHELF.bayWidth - perRow * SHELF_PITCH + SHELF.gap;
  const slots: ShelfSlot[] = [];
  for (let i = 0; i < count; i++) {
    const bay = Math.floor(i / perBay);
    const inBay = i % perBay;
    const row = Math.floor(inBay / perRow);
    const k = inBay % perRow;
    slots.push({
      x: bayLeft(bay) + rowSlack / 2 + k * SHELF_PITCH + CASE.depth / 2,
      y: rowFloor(row) + CASE.length / 2 + 0.005,
      z: SHELF_CASE_Z,
      bay,
      row,
    });
  }
  const bayCentres = Array.from({ length: bays }, (_, b) => bayLeft(b) + SHELF.bayWidth / 2);
  return {
    slots,
    bays,
    perRow,
    perBay,
    bounds: {
      minX: bayLeft(0) - SHELF.side,
      maxX: bayLeft(bays - 1) + SHELF.bayWidth + SHELF.side,
      minY: 0,
      maxY: SHELF_HEIGHT,
    },
    bayCentres,
    rowFloors: Array.from({ length: SHELF.rows }, (_, r) => rowFloor(r)),
  };
}
