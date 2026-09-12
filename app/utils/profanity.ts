import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

// One shared matcher: English word list with the recommended transformers,
// which catch obfuscation (f*ck, fvck, f u c k) while still avoiding the
// classic false positives ("assassin", "Scunthorpe").
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/** True when the text contains profanity. Empty / nullish input is clean. */
export function containsProfanity(text: string | null | undefined): boolean {
  if (!text) return false;
  return matcher.hasMatch(text);
}

/**
 * Check several labelled fields at once and return the label of the first
 * offending one (e.g. "title"), or null when everything is clean. Lets the UI
 * say *which* field to fix.
 */
export function findProfanity(fields: Record<string, string | null | undefined>): string | null {
  for (const [label, value] of Object.entries(fields)) {
    if (containsProfanity(value)) return label;
  }
  return null;
}

export const PROFANITY_MESSAGE = (label: string) =>
  `Your ${label} contains language that isn't allowed on public content. Please change it first.`;
