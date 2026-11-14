import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Why the print says what it says (L2-263 AC2): a heading with its accent word, and the passage it
 * rests on, projected as paragraphs.
 *
 *     <section jb-merch-story before="Why" accent="“purpose”" after="is the gold word.">
 *       <p>…</p>
 *     </section>
 */
@Component({
  selector: 'section[jb-merch-story]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'merch-story', '[attr.aria-labelledby]': 'titleId()' },
  templateUrl: './merch-story.html',
  styleUrl: './merch-story.scss',
})
export class MerchStory {
  readonly before = input('');
  readonly accent = input.required<string>();
  readonly after = input('');
  readonly titleId = input('story-title');
}
