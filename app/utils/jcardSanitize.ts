import DOMPurify from 'dompurify';
import { liftListColors } from './htmlUtils';

const ALLOWED_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'u', 's', 'br', 'span'];
const ALLOWED_ATTR = ['style', 'class'];

/**
 * Sanitize J-card rich-text HTML for safe rendering via v-html.
 * SSR-guarded (DOMPurify/DOMParser are browser-only).
 */
export function sanitizeJCardHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const normalized = html
    .replace(/<p>\s*<\/p>/g, '<p><br></p>')
    .replace(/<p> <\/p>/g, '<p><br></p>');
  const clean = DOMPurify.sanitize(normalized, { ALLOWED_TAGS, ALLOWED_ATTR, KEEP_CONTENT: true });
  return liftListColors(clean);
}
