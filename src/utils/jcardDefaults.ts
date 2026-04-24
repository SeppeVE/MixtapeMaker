import { JCardContent, Mixtape, Song } from '../types';

export function buildBlankJCardContent(): JCardContent {
  return {
    flaps: 2,
    isReversed: false,
    shortBack: false,
    backgroundColor: '#EFE8D6',
    coverContent: '',
    coverImageBehindContent: false,
    isFullCoverImage: false,
    spineTopContent: '',
    spineCenterContent: '',
    spineBottomContent: '',
    backLeftContent: '',
    backRightContent: '',
  };
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toList(songs: Song[]): string {
  if (!songs.length) return '';
  return '<ol>' + songs.map(s => `<li>${esc(s.title)} — ${esc(s.artist)}</li>`).join('') + '</ol>';
}

export function applyMixtapeToJCard(
  content: JCardContent,
  mixtape: Mixtape,
  opts: { overwriteCover?: boolean } = {},
): JCardContent {
  return {
    ...content,
    coverContent: opts.overwriteCover ? `<h2>${esc(mixtape.title)}</h2>` : content.coverContent,
    spineTopContent: `<strong>${esc(mixtape.title)}</strong>`,
    spineBottomContent: `${mixtape.cassetteLength} min`,
    backLeftContent: `<h4>Side A</h4>${toList(mixtape.sideA)}`,
    backRightContent: `<h4>Side B</h4>${toList(mixtape.sideB)}`,
  };
}
