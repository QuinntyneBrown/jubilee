import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ContentSlug = 'statement-of-faith' | 'terms' | 'privacy' | 'help';

export interface ContentSection {
  heading: string;
  anchor: string;
  body: string;
}

/** One policy page as published (L2-107 to L2-110). */
export interface ContentPage {
  slug: ContentSlug;
  title: string;
  lead: string;
  version: number;
  publishedAt: string;
  sections: ContentSection[];
}

/** Contract of the policy pages: the published version of one page. */
export interface ContentApi {
  get(slug: ContentSlug): Observable<ContentPage>;
}

export const CONTENT_API = new InjectionToken<ContentApi>('CONTENT_API');

@Injectable()
export class HttpContentApi implements ContentApi {
  private readonly http = inject(HttpClient);

  get(slug: ContentSlug): Observable<ContentPage> {
    return this.http.get<ContentPage>(`/api/content/${slug}`);
  }
}

/** A run of text in a body block, with the address when it is a link. */
export interface BodyPart {
  text: string;
  href?: string;
}

export type BodyBlock =
  { kind: 'paragraph'; parts: BodyPart[] } | { kind: 'list'; items: BodyPart[][] };

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Only a page of Jubilee or an e-mail address is a link; anything else stays text. */
function safe(href: string): boolean {
  return (/^\/(?!\/)/.test(href) || /^mailto:[^\s@]+@[^\s@]+$/.test(href)) && !href.includes('\\');
}

function parts(text: string): BodyPart[] {
  const result: BodyPart[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    if (match.index > last) result.push({ text: text.slice(last, match.index) });
    result.push(safe(match[2]) ? { text: match[1], href: match[2] } : { text: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) result.push({ text: text.slice(last) });
  return result;
}

/**
 * Splits a section's body into what the page renders: paragraphs (separated by a blank line)
 * and bullet lists ("- " lines). The body is never treated as markup (L2-107, ADR 0030).
 */
export function parseBody(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  for (const chunk of body.split(/\n\s*\n/)) {
    const lines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    if (lines.every((line) => line.startsWith('- '))) {
      blocks.push({ kind: 'list', items: lines.map((line) => parts(line.slice(2))) });
    } else {
      blocks.push({ kind: 'paragraph', parts: parts(lines.join(' ')) });
    }
  }
  return blocks;
}
