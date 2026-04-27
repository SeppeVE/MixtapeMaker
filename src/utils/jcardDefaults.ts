import { JCardContent, Mixtape, Song } from '../types';
import { formatDuration } from './timeUtils';

const FLAP_COUNT = 6;

export function buildBlankJCardContent(): JCardContent {
  return {
    flaps: 2,
    isReversed: false,
    shortBack: false,
    backgroundColor: '#EFE8D6',
    continuousBackground: false,
    flapContents: Array(FLAP_COUNT).fill(''),
    coverImageBehindContent: false,
    isFullCoverImage: false,
    spineTopContent: '',
    spineCenterContent: '',
    spineBottomContent: '',
    backLeftContent: '',
    backRightContent: '',
    showCutGuides: false,
  };
}

/**
 * Migrate a card loaded from storage that may still use the old `coverContent`
 * field instead of `flapContents`. Safe to call on already-migrated cards.
 */
export function migrateJCardContent(c: JCardContent): JCardContent {
  if (c.flapContents && c.flapContents.length === FLAP_COUNT) return c;
  // Legacy card: build flapContents from coverContent
  const flapContents = Array(FLAP_COUNT).fill('');
  if ((c as any).coverContent) flapContents[0] = (c as any).coverContent;
  return { ...c, flapContents };
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toListWithDuration(songs: Song[]): string {
  if (!songs.length) return '';
  return (
    '<ol>' +
    songs
      .map(s => {
        const dur = s.duration ? `<span style="float:right;opacity:0.7">${formatDuration(s.duration)}</span>` : '';
        return `<li>${dur}${esc(s.title)} — ${esc(s.artist)}</li>`;
      })
      .join('') +
    '</ol>'
  );
}

export function applyMixtapeToJCard(
  content: JCardContent,
  mixtape: Mixtape,
  opts: { overwriteCover?: boolean } = {},
): JCardContent {
  const flapContents = [...content.flapContents];
  if (opts.overwriteCover) flapContents[0] = `<h2>${esc(mixtape.title)}</h2>`;
  return {
    ...content,
    flapContents,
    spineTopContent: `<strong>${esc(mixtape.title)}</strong>`,
    spineBottomContent: `${mixtape.cassetteLength} min`,
    backLeftContent: `<h4>Side A</h4>${toListWithDuration(mixtape.sideA)}`,
    backRightContent: `<h4>Side B</h4>${toListWithDuration(mixtape.sideB)}`,
  };
}
