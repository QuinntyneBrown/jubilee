import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** A run of text in a block, with the address when it is a link. */
export interface PolicyTextPart {
  text: string;
  href?: string;
}

/** A paragraph or a bullet list of a section's body. */
export type PolicyBlock =
  { kind: 'paragraph'; parts: PolicyTextPart[] } | { kind: 'list'; items: PolicyTextPart[][] };

/** One section of a policy page: its heading, the anchor a link opens it by, and its blocks. */
export interface PolicySection {
  heading: string;
  anchor: string;
  blocks: PolicyBlock[];
}

const DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * A policy page as members read it (L2-107 to L2-109): title, lead, sections and "Last updated
 * {date}" in Toronto time. The app's statement of faith, terms and privacy pages render it, and
 * the admin application's editor previews a draft in it (L2-226, ADR 0066):
 *
 *     <article jb-policy-document [heading]="page.title" [lead]="page.lead"
 *       [sections]="sections" [updated]="page.publishedAt"></article>
 *
 * `level` 2 sets the title as an `h2` and the sections as `h3`, for a page whose own `h1` names
 * it; the look is the same. The text is never treated as markup: blocks arrive parsed.
 */
@Component({
  selector: 'article[jb-policy-document]',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'policy-document' },
  templateUrl: './policy-document.html',
  styleUrl: './policy-document.scss',
})
export class PolicyDocument {
  readonly heading = input.required<string>();
  readonly lead = input('');
  readonly sections = input.required<readonly PolicySection[]>();
  /** When the text was published, as an ISO date and time. */
  readonly updated = input.required<string>();
  readonly level = input<1 | 2>(1);

  protected readonly updatedLabel = computed(() => {
    const parts = Object.fromEntries(
      DAY.formatToParts(new Date(this.updated())).map((p) => [p.type, p.value]),
    );
    return `${parts['day']} ${parts['month']} ${parts['year']}`;
  });
}
