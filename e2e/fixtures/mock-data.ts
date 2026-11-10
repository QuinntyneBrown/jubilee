import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { categories } from './categories';

/**
 * Data fixtures read from the mocks themselves. A state that the seeded data cannot produce
 * (the edge and long states) is given to the app as the API answer that would render exactly
 * what its mock shows, so the mock stays the single description of the state.
 */
const mocksDir = join(__dirname, '..', '..', 'docs', 'mocks');

const shortLabels: Record<string, string> = {
  Shop: 'shops',
  Financial: 'financial-insurance',
  Legal: 'legal-immigration',
  Home: 'home-property',
  'Real estate': 'real-estate-living',
  Health: 'health-family',
  Business: 'business-tech',
  Learning: 'learning',
  Media: 'media',
  Community: 'community',
};

// The first drawing command of each product icon in the mocks.
const productIcons: Record<string, string> = {
  'M8 4 3 7': 'shirt',
  'M5 8h11': 'mug',
  'M4 19V5': 'book',
  'M5 8h14': 'bag',
};

function read(file: string): string {
  return readFileSync(join(mocksDir, file), 'utf8');
}

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function between(html: string, start: string, end: string): string {
  const from = html.indexOf(start);
  if (from < 0) throw new Error(`"${start}" is not in the mock`);
  const to = html.indexOf(end, from);
  return html.slice(from, to < 0 ? undefined : to);
}

function first(html: string, pattern: RegExp): string {
  const match = pattern.exec(html);
  if (!match) throw new Error(`${pattern} does not match the mock`);
  return match[1];
}

function count(value: string): number {
  return Number(value.replace(/,/g, ''));
}

function businessCards(html: string) {
  const cards = html.match(/<a class="biz-card" .*?<\/a>/gs) ?? [];
  return cards.map((card, index) => {
    const name = text(first(card, /biz-card__name">(.*?)<\/h3>/s));
    const perk = /class="perk">(.*?)<\/span>/s.exec(card);
    return {
      // Mocks repeat businesses to fill a page; the position keeps every slug unique.
      slug: `${slugify(name)}-${index + 1}`,
      name,
      tagline: text(first(card, /biz-card__tagline">(.*?)<\/p>/s)),
      highlight: perk ? text(perk[1]) : null,
      categorySlug: shortLabels[text(first(card, /media__tag">(.*?)<\/span>/s))],
      verified: card.includes('class="verified"'),
      coverPhoto: null,
    };
  });
}

/** The browse home answer that renders `pages/browse/{state}.html`. */
export function browseHomeFromMock(state: 'default' | 'edge') {
  const html = read(`pages/browse/${state}.html`);
  const products = (
    between(html, 'id="shops"', '</section>').match(/<a class="biz-card product-card".*?<\/a>/gs) ??
    []
  ).map((card) => {
    const name = text(first(card, /biz-card__name">(.*?)<\/h3>/s));
    const price = text(first(card, /class="price">(.*?)<\/p>/s));
    const shopName = text(first(card, /biz-card__tagline">(.*?)<\/p>/s));
    const drawing = first(card, /<path d="([^"]{8})/);
    const icon = Object.entries(productIcons).find(([start]) => drawing.startsWith(start));
    return {
      slug: slugify(name),
      businessSlug: slugify(shopName),
      name,
      shopName,
      priceCents: Math.round(Number(first(price, /\$([\d.,]+)/).replace(/,/g, '')) * 100),
      perUnit: price.endsWith(' ea'),
      tile: {
        tint: first(card, /media media--(\w+)/),
        icon: icon ? icon[1] : 'bag',
      },
    };
  });

  const groups = (html.match(/<section class="dir-group".*?<\/section>/gs) ?? []).map((group) => {
    const name = text(first(group, /<h3[^>]*>(.*?)<\/h3>/s));
    const category = categories.find((c) => c.name === name);
    if (!category) throw new Error(`"${name}" is not a category`);
    return {
      slug: category.slug,
      name,
      count: count(first(group, /aria-label="([\d,]+) businesses"/)),
      hasMore: group.includes('class="dir-more"'),
      businesses: (group.match(/<a class="dir-row".*?<\/a>/gs) ?? []).map((row, index) => {
        const rowName = text(first(row, /<span class="truncate">(.*?)<\/span>/s));
        return {
          slug: `${slugify(rowName)}-${index + 1}`,
          name: rowName,
          tagline: text(first(row, /dir-row__tagline[^>]*>(.*?)<\/span>/s)),
          verified: row.includes('Verified'),
        };
      }),
    };
  });

  return {
    liveBusinessCount: count(first(html, /hero__sub">([\d,]+) verified/)),
    categories,
    featured: businessCards(between(html, 'id="feat"', '</section>')),
    products,
    groups,
  };
}

/** The category answer that renders `pages/category/long.html`: page 1 of a long category. */
export function categoryPageFromMock(state: 'long') {
  const html = read(`pages/category/${state}.html`);
  const totalCount = count(first(html, /class="subtitle">([\d,]+) verified/));
  const pageSize = 16;
  return {
    category: { slug: 'home-property', name: 'Home & property' },
    totalCount,
    matchCount: totalCount,
    fact: { offer: 'emergency-calls', count: count(first(html, /· ([\d,]+) take emergency/)) },
    filters: { offers: [], areas: [] },
    sort: 'recommended',
    page: 1,
    pageSize,
    pageCount: Math.ceil(totalCount / pageSize),
    businesses: businessCards(between(html, '<ul class="card-grid">', '</ul>')),
    suggestions: [],
  };
}
