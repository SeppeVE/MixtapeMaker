/**
 * Client-side checks on a sign-up email, run before Supabase sends the
 * confirmation mail. Every confirmation sent to an address that doesn't exist
 * bounces, and Supabase restricts its built-in mailer for projects with a high
 * bounce rate, so we stop the obvious cases here:
 *
 *  - malformed addresses the browser's `type="email"` check lets through
 *    (e.g. `name@gmail`, no TLD)
 *  - reserved / placeholder domains that can never receive mail
 *    (`example.com`, `*.test`, `*.invalid`, `localhost`, ...)
 *  - throwaway inbox services
 *  - typos of common providers (`gmial.com`, `hotmail.con`), which are offered
 *    as a "did you mean" suggestion rather than blocked outright, so a real but
 *    unusual domain can still sign up.
 *
 * This is a UX guard, not security: it's trivially bypassed by calling the
 * Supabase API directly. The `before_user_created` hook in SUPABASE_SETUP.md
 * enforces the hard rules on the server.
 */

export interface EmailCheck {
  /** Trimmed, lower-cased address to send to Supabase. */
  email: string;
  /** Set when the address should not be submitted at all. */
  error?: string;
  /** Set when the domain looks like a typo of a common provider. */
  suggestion?: string;
}

// Local part: anything without whitespace or @. Domain: dot-separated labels
// ending in an alphabetic TLD of 2+ chars. Deliberately looser than RFC 5322
// on the local part, stricter than `type="email"` on the domain.
const EMAIL_SHAPE = /^[^\s@]+@((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})$/;

/** Domains and TLDs reserved by RFC 2606 / 6761 — they never accept mail. */
const RESERVED_TLDS = ['test', 'example', 'invalid', 'localhost', 'local', 'internal'];
const RESERVED_DOMAINS = ['example.com', 'example.net', 'example.org'];

/** Placeholder domains people type when they don't want to give a real one. */
const PLACEHOLDER_DOMAINS = ['test.com', 'test.be', 'fake.com', 'asdf.com', 'abc.com', 'xyz.com', 'domain.com', 'email.test'];

/** Common disposable-inbox services. Not exhaustive — just the big ones. */
const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com',
  '10minutemail.com', 'yopmail.com', 'temp-mail.org', 'tempmail.com', 'trashmail.com',
  'throwawaymail.com', 'maildrop.cc', 'dispostable.com', 'getnada.com', 'mailnesia.com',
  'fakeinbox.com', 'mintemail.com', 'emailondeck.com', 'mohmal.com', 'tempail.com',
];

/** Real providers we check typos against. Exact matches are always accepted. */
const COMMON_DOMAINS = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.be', 'hotmail.co.uk', 'hotmail.fr',
  'outlook.com', 'outlook.be', 'live.com', 'live.be', 'msn.com', 'yahoo.com', 'yahoo.co.uk',
  'yahoo.fr', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
  'gmx.com', 'gmx.de', 'gmx.net', 'mail.com', 'zoho.com', 'telenet.be', 'skynet.be',
  'proximus.be', 'scarlet.be', 'web.de', 'orange.fr', 'free.fr', 'ziggo.nl', 'kpnmail.nl',
];

/** TLD typos, applied when no provider match is found. */
const TLD_TYPOS: Record<string, string> = {
  con: 'com', cmo: 'com', ocm: 'com', vom: 'com', xom: 'com', comm: 'com', om: 'com', co: 'com',
  nte: 'net', ent: 'net', ogr: 'org', rog: 'org',
};

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

function suggestDomain(domain: string): string | undefined {
  if (COMMON_DOMAINS.includes(domain)) return undefined;

  let best: string | undefined;
  let bestDist = 3;
  for (const known of COMMON_DOMAINS) {
    const d = editDistance(domain, known);
    if (d < bestDist) {
      best = known;
      bestDist = d;
    }
  }
  // Short domains (e.g. "me.co") are too close to too many things; only
  // accept a 2-edit match when the domain is long enough to be unambiguous.
  if (best && (bestDist === 1 || domain.length >= 8)) return best;

  const dot = domain.lastIndexOf('.');
  const tld = domain.slice(dot + 1);
  const fixed = TLD_TYPOS[tld];
  // ".co" is a real TLD; only treat it as a typo for providers that are .com.
  if (fixed && (tld !== 'co' || COMMON_DOMAINS.includes(`${domain.slice(0, dot)}.com`))) {
    return `${domain.slice(0, dot)}.${fixed}`;
  }
  return undefined;
}

export function checkSignupEmail(raw: string): EmailCheck {
  const email = raw.trim().toLowerCase();
  const match = EMAIL_SHAPE.exec(email);
  if (!match) {
    return { email, error: "That doesn't look like a complete email address. Check for typos, e.g. name@gmail.com." };
  }

  const domain = match[1]!;
  const tld = domain.slice(domain.lastIndexOf('.') + 1);

  if (RESERVED_TLDS.includes(tld) || RESERVED_DOMAINS.includes(domain) || PLACEHOLDER_DOMAINS.includes(domain)) {
    return { email, error: `${domain} can't receive email. Please use an address you can open, we'll send a confirmation link to it.` };
  }

  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { email, error: 'Temporary inboxes aren\'t supported. Please use your regular email address.' };
  }

  const suggestedDomain = suggestDomain(domain);
  if (suggestedDomain) {
    return { email, suggestion: `${email.slice(0, email.lastIndexOf('@'))}@${suggestedDomain}` };
  }

  return { email };
}
