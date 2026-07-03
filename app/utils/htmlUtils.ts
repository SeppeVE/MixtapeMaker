/**
 * CSS `::marker` inherits `color` from the <li> element itself — NOT from
 * descendant <span> elements (where Tiptap's Color extension puts it).
 * liftListColors walks the parsed HTML, finds every <li>, locates the first
 * child <span> that carries an explicit color, and copies it onto the <li>'s
 * own inline style so the bullet/number marker renders in the right colour.
 *
 * This is the string-based counterpart of `syncListColors` in ContentEditor,
 * which does the same thing on the live editor DOM.
 */
export function liftListColors(html: string): string {
  if (typeof window === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  doc.body.querySelectorAll<HTMLLIElement>('li').forEach(li => {
    let color = '';
    for (const span of li.querySelectorAll<HTMLElement>('span')) {
      if (span.style.color) { color = span.style.color; break; }
    }
    if (color) {
      li.style.setProperty('color', color, 'important');
    } else {
      li.style.removeProperty('color');
    }
  });
  return doc.body.innerHTML;
}
