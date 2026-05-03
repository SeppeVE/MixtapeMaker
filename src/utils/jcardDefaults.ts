import { JCardContent, Mixtape, Song } from '../types';
import { formatDuration } from './timeUtils';
import placeholderCover from '../../assets/images/placeholder.jpg';

const FLAP_COUNT = 6;

export function buildBlankJCardContent(): JCardContent {
  return {
    flaps: 2,
    isReversed: false,
    shortBack: false,
    backgroundColor: '#EFE8D6',
    continuousBackground: false,
    flapContents: [
      '<h2 style="text-align:center;font-size:5mm">My Mixtape</h2>',
      ...Array(FLAP_COUNT - 1).fill(''),
    ],
    coverImageUrl: placeholderCover,
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
  let out = c;

  // -- flapContents migration
  if (!out.flapContents || out.flapContents.length !== FLAP_COUNT) {
    const flapContents = Array(FLAP_COUNT).fill('') as string[];
    if ((out as any).coverContent) flapContents[0] = (out as any).coverContent;
    out = { ...out, flapContents };
  }

  // -- insideFlapContents migration
  if (!out.insideFlapContents || out.insideFlapContents.length !== FLAP_COUNT) {
    const insideFlapContents = Array(FLAP_COUNT).fill('') as string[];
    out = { ...out, insideFlapContents };
  }

  // -- per-flap image arrays migration
  if (!out.flapImageUrls || out.flapImageUrls.length !== FLAP_COUNT) {
    out = { ...out, flapImageUrls: Array(FLAP_COUNT).fill(undefined) };
  }
  if (!out.flapImageFulls || out.flapImageFulls.length !== FLAP_COUNT) {
    out = { ...out, flapImageFulls: Array(FLAP_COUNT).fill(false) };
  }
  if (!out.flapImageBehindContents || out.flapImageBehindContents.length !== FLAP_COUNT) {
    out = { ...out, flapImageBehindContents: Array(FLAP_COUNT).fill(false) };
  }
  if (!out.insideFlapImageUrls || out.insideFlapImageUrls.length !== FLAP_COUNT) {
    out = { ...out, insideFlapImageUrls: Array(FLAP_COUNT).fill(undefined) };
  }
  if (!out.insideFlapImageFulls || out.insideFlapImageFulls.length !== FLAP_COUNT) {
    out = { ...out, insideFlapImageFulls: Array(FLAP_COUNT).fill(false) };
  }
  if (!out.insideFlapImageBehindContents || out.insideFlapImageBehindContents.length !== FLAP_COUNT) {
    out = { ...out, insideFlapImageBehindContents: Array(FLAP_COUNT).fill(false) };
  }

  return out;
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTrackList(songs: Song[], showDuration: boolean): string {
  if (!songs.length) return '';
  return (
    '<ol>' +
    songs
      .map(s => {
        const dur = showDuration && s.duration
          ? ' <span style="opacity:0.6">' + formatDuration(s.duration) + '</span>'
          : '';
        return '<li>' + esc(s.title) + ' — ' + esc(s.artist) + dur + '</li>';
      })
      .join('') +
    '</ol>'
  );
}

export function applyMixtapeToJCard(
  content: JCardContent,
  mixtape: Mixtape,
  opts: { overwriteCover?: boolean; showDuration?: boolean } = {},
): JCardContent {
  const { overwriteCover = false, showDuration = false } = opts;
  const flapContents = [...content.flapContents];
  if (overwriteCover) flapContents[0] = '<h2>' + esc(mixtape.title) + '</h2>';
  return {
    ...content,
    flapContents,
    spineTopContent: '<strong>' + esc(mixtape.title) + '</strong>',
    spineBottomContent: mixtape.cassetteLength + ' min',
    backLeftContent:  '<h4>Side A</h4>' + buildTrackList(mixtape.sideA, showDuration),
    backRightContent: '<h4>Side B</h4>' + buildTrackList(mixtape.sideB, showDuration),
  };
}
