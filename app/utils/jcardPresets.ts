import { JCardContent } from '../types';
import { buildBlankJCardContent } from './jcardDefaults';

export interface JCardPreset {
  id: string;
  label: string;
  emoji: string;
  content: Partial<JCardContent>;
}

const blank = buildBlankJCardContent();

export const JCARD_PRESETS: JCardPreset[] = [
  {
    id: 'vaporwave',
    label: 'Vaporwave',
    emoji: '🌊',
    content: {
      ...blank,
      backgroundColor: '#2A0A3A',
      flapContents: [
        '<h2 style="color:#ff71ce;font-size:5mm;text-align:center">A E S T H E T I C</h2><p style="color:#b967ff;text-align:center;font-size:3mm">───── ✦ ─────</p>',
        '', '', '', '', '',
      ],
      spineTopContent: '<strong style="color:#ff71ce">SIDE A</strong>',
      spineBottomContent: '<span style="color:#b967ff">∞ min</span>',
    },
  },
  {
    id: 'kraft',
    label: 'Kraft Minimal',
    emoji: '📦',
    content: {
      ...blank,
      backgroundColor: '#C8A96E',
      flapContents: [
        '<p style="font-size:3.5mm;text-align:center;color:#3a2a1a">mixtape</p>',
        '', '', '', '', '',
      ],
      spineTopContent: '<strong>SIDE A</strong>',
      spineBottomContent: '90 min',
    },
  },
  {
    id: 'punk-zine',
    label: 'Punk Zine',
    emoji: '✂️',
    content: {
      ...blank,
      backgroundColor: '#FAF6EB',
      flapContents: [
        '<h1 style="font-size:7mm;text-transform:uppercase;letter-spacing:-0.5mm">MIXTAPE</h1><p style="font-size:2.5mm;border-top:1px solid #2A1E28;padding-top:1mm">VOL. 1</p>',
        '', '', '', '', '',
      ],
      spineTopContent: '<strong>SIDE A</strong>',
      spineBottomContent: '90 min',
      showCutGuides: true,
    },
  },
  {
    id: 'vintage',
    label: 'Vintage',
    emoji: '🎞️',
    content: {
      ...blank,
      backgroundColor: '#F2E8D5',
      flapContents: [
        '<p style="font-size:2.5mm;text-align:center;color:#6b4c2a;letter-spacing:0.5mm;text-transform:uppercase">personal collection</p><h3 style="font-size:4mm;text-align:center;color:#3d2b1f">My Mixtape</h3><p style="font-size:2mm;text-align:center;color:#8a6a50">✦ ✦ ✦</p>',
        '', '', '', '', '',
      ],
      spineTopContent: '<em style="color:#6b4c2a">SIDE A</em>',
      spineBottomContent: '<span style="color:#8a6a50">90 min</span>',
    },
  },
  {
    id: 'monochrome',
    label: 'Monochrome',
    emoji: '◼',
    content: {
      ...blank,
      backgroundColor: '#2A1E28',
      flapContents: [
        '<h2 style="color:#FAF6EB;text-align:center;font-size:4mm">MIXTAPE</h2><p style="color:rgba(255,255,255,0.4);text-align:center;font-size:2mm">────────</p>',
        '', '', '', '', '',
      ],
      spineTopContent: '<strong style="color:#FAF6EB">SIDE A</strong>',
      spineBottomContent: '<span style="color:rgba(255,255,255,0.5)">90 min</span>',
    },
  },
];
