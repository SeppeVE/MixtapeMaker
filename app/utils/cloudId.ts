// Ids for rows that start life as a local draft and are later saved to the
// cloud. A draft carries a timestamp id from generateId(); the cloud row needs
// a UUID. Deriving that UUID from the local id (instead of minting a random
// one, or letting Postgres pick) means every save of the same draft, from any
// tab, retry or device, lands on the same row, so a save can never fork a
// draft into two records.

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A cloud-saved row always has a UUID id. */
export const isCloudId = (id: string): boolean => UUID_RE.test(id);

// 32-bit FNV-1a, used four times with different seeds to build 128 bits.
function fnv1a32(str: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

// Deterministic (not random) UUID derived from an arbitrary string. The same
// input always produces the same output, from any tab, any device, with or
// without a warm cache, unlike crypto.randomUUID(), which mints a different id
// every call. Not cryptographic; a 128-bit hash's collision odds are
// astronomically below this app's id volume.
export function deterministicUuid(seed: string): string {
  const chunks = [
    fnv1a32(seed, 0x811c9dc5),
    fnv1a32(`a:${seed}`, 0x811c9dc5),
    fnv1a32(`b:${seed}`, 0x811c9dc5),
    fnv1a32(`c:${seed}`, 0x811c9dc5),
  ];
  const bytes = chunks.map((n) => n.toString(16).padStart(8, '0')).join('').match(/.{2}/g)!;
  // Stamp version/variant bits so it reads as a well-formed (v5-shaped) UUID.
  bytes[6] = ((parseInt(bytes[6], 16) & 0x0f) | 0x50).toString(16).padStart(2, '0');
  bytes[8] = ((parseInt(bytes[8], 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  const hex = bytes.join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The cloud id of a J-card: its own id once it has one, otherwise the UUID
 * derived from its local draft id. Prefixed so a card can never derive the
 * same id as a mixtape.
 */
export const jcardCloudId = (id: string): string => (isCloudId(id) ? id : deterministicUuid(`jcard:${id}`));
