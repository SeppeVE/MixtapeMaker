import { useHead } from '#app';

const SITE_URL = 'https://mixtape-maker.com';

export interface Breadcrumb {
  name: string;
  path: string;
}

/**
 * BreadcrumbList structured data for the current page. Google shows it as the
 * "mixtape-maker.com › Explore" trail above the result title. Home is added
 * automatically; pass the crumbs after it, ending with the current page.
 */
export function useBreadcrumbs(crumbs: Breadcrumb[]) {
  const items = [{ name: 'Home', path: '/' }, ...crumbs];
  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            item: c.path === '/' ? SITE_URL : `${SITE_URL}${c.path}`,
          })),
        }),
      },
    ],
  });
}
