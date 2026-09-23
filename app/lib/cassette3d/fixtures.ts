import type { JCardContent, Mixtape, Song } from '~/types';
import { applyMixtapeToJCard, buildBlankJCardContent } from '~/utils/jcardDefaults';
import typewriterFont from '@fontsource/special-elite/files/special-elite-latin-400-normal.woff2?inline';
import type { TapeData } from './tapeData';

/**
 * Sample mixtape + J-card pairs for developing and screenshotting the 3D viewer
 * without a Supabase project (`?fixture=1|2|3`). Each one exercises a different
 * part of the texture pipeline:
 *
 *  1. The blank card the editor starts from, filled from the mixtape: same-origin
 *     placeholder cover, curated font, full back.
 *  2. Uploaded-style images kept inline as data: URLs (the upload fallback), a
 *     continuous background, three flaps, inside content, short back.
 *  3. An uploaded custom font (base64), five flaps, a reversed layout.
 *
 * Replace or extend with real rows (JSON from the `mixtapes` and `jcards` tables)
 * to check real content.
 */

const SONGS: [string, string, number][] = [
  ['Heroes', 'David Bowie', 371],
  ['Dreams', 'Fleetwood Mac', 257],
  ['Once in a Lifetime', 'Talking Heads', 259],
  ['Pink Moon', 'Nick Drake', 124],
  ['Just Like Heaven', 'The Cure', 212],
  ['Holocene', 'Bon Iver', 336],
  ['Everybody Wants to Rule the World', 'Tears for Fears', 251],
  ['Space Song', 'Beach House', 320],
  ['Harvest Moon', 'Neil Young', 303],
  ['Tame', 'Pixies', 115],
  ['Teardrop', 'Massive Attack', 330],
  ['Lua', 'Bright Eyes', 271],
];

function songs(from: number, count: number): Song[] {
  return Array.from({ length: count }, (_, i) => {
    const [title, artist, duration] = SONGS[(from + i) % SONGS.length]!;
    return { id: `fx-${from + i}`, title, artist, album: '', duration, albumCover: '' };
  });
}

function mixtape(id: string, title: string, length: Mixtape['cassetteLength'], a: number, b: number): Mixtape {
  const now = '2026-09-23T12:00:00.000Z';
  return {
    id, title, cassetteLength: length, sideA: songs(0, a), sideB: songs(a, b),
    createdAt: now, updatedAt: now, isPublic: false,
  };
}

function pair(m: Mixtape, content: JCardContent, updatedAt = m.updatedAt): TapeData {
  return {
    mixtape: m,
    jcard: { id: `jc-${m.id}`, title: m.title, userId: 'fixture', mixtapeId: m.id, content, createdAt: m.createdAt, updatedAt },
    source: 'fixture',
  };
}

/** A soft two-colour gradient with a grain, as a PNG data URL (like an inline upload). */
function gradientImage(w: number, h: number, from: string, to: string, angle = 0.6): string {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, Math.cos(angle) * w, Math.sin(angle) * h);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.04 + (i % 5) * 0.02})`;
    ctx.beginPath();
    ctx.arc(((i * 97) % w), ((i * 57) % h), 8 + (i % 7) * 9, 0, Math.PI * 2);
    ctx.fill();
  }
  return c.toDataURL('image/png');
}

function fixture1(): TapeData {
  const m = mixtape('fixture-1', 'Summer Drive 2026', 90, 6, 6);
  const content = applyMixtapeToJCard(buildBlankJCardContent(), m, { overwriteCover: true, showDuration: true });
  content.flapContents[0] = '<h2 style="text-align:center;font-size:6mm"><span style="font-family: \'Permanent Marker\'">Summer Drive 2026</span></h2>';
  content.flapContents[1] = '<p style="font-size:3.2mm"><span style="font-family: \'Caveat\'; font-size: 5mm">For long evenings with the windows down.</span></p>';
  return pair(m, content);
}

function fixture2(): TapeData {
  const m = mixtape('fixture-2', 'Night Bus Home', 60, 5, 5);
  const base = applyMixtapeToJCard(buildBlankJCardContent(), m);
  const content: JCardContent = {
    ...base,
    flaps: 3,
    shortBack: true,
    backgroundColor: '#1d2a44',
    continuousBackground: true,
    backgroundImageUrl: gradientImage(900, 400, '#1d2a44', '#7a3b69'),
    coverImageUrl: gradientImage(400, 400, '#f2b35a', '#c8452e', 1.2),
    isFullCoverImage: false,
    coverImageBehindContent: false,
    flapContents: [
      '<h2 style="text-align:center;color:#f7f1e3"><span style="font-family: \'Bebas Neue\'; font-size: 9mm">NIGHT BUS HOME</span></h2>',
      '<p style="color:#f7f1e3"><span style="font-family: \'EB Garamond\'; font-size: 4mm">Side A for the ride out, side B for the ride back.</span></p>',
      '<p style="color:#f7f1e3;text-align:center"><span style="font-family: \'JetBrains Mono\'; font-size: 3mm">recorded 23·09·2026</span></p>',
      '', '', '',
    ],
    spineTopContent: '<span style="color:#f7f1e3;font-family: \'Bebas Neue\'">NIGHT BUS HOME</span>',
    spineBottomContent: '<span style="color:#f7f1e3">C60</span>',
    backLeftContent: '',
    backRightContent: '',
    insideFlapContents: [
      '<h3 style="color:#f7f1e3">Side A</h3><ol style="color:#f7f1e3"><li>Heroes</li><li>Dreams</li><li>Once in a Lifetime</li><li>Pink Moon</li><li>Just Like Heaven</li></ol>',
      '<h3 style="color:#f7f1e3">Side B</h3><ol style="color:#f7f1e3"><li>Holocene</li><li>Everybody Wants to Rule the World</li><li>Space Song</li><li>Harvest Moon</li><li>Tame</li></ol>',
      '<p style="color:#f2b35a"><em>Thanks for listening.</em></p>',
      '', '', '',
    ],
  };
  return pair(m, content);
}

function fixture3(): TapeData {
  const m = mixtape('fixture-3', 'Typewriter Letters (a very long mixtape title that has to fit)', 120, 6, 6);
  const base = applyMixtapeToJCard(buildBlankJCardContent(), m);
  const data = typewriterFont.slice(typewriterFont.indexOf(',') + 1);
  const content: JCardContent = {
    ...base,
    flaps: 5,
    isReversed: true,
    backgroundColor: '#e7d8b8',
    customFonts: [{ name: 'Fixture Typewriter', data, mimeType: 'font/woff2' }],
    flapContents: [
      '<h2 style="text-align:center"><span style="font-family: \'Fixture Typewriter\'; font-size: 6mm">Typewriter Letters</span></h2>',
      '<p><span style="font-family: \'Fixture Typewriter\'">Dear you, here are the songs I kept meaning to send.</span></p>',
      '<p><span style="font-family: \'Special Elite\'">Panel three.</span></p>',
      '<p><span style="font-family: \'Playfair Display\'">Panel four.</span></p>',
      '<p><span style="font-family: \'Inter\'">Panel five.</span></p>',
      '',
    ],
  };
  return pair(m, content);
}

export const FIXTURES: Record<string, () => TapeData> = {
  '1': fixture1,
  '2': fixture2,
  '3': fixture3,
};
