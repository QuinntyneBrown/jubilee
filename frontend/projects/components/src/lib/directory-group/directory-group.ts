import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * One category of the directory: its name, how many businesses it has, the rows the page
 * projects and a link to the rest.
 *
 *     <section jb-directory-group heading="Trades" headingId="g-trades" count="12"
 *              countLabel="12 businesses" moreLabel="See all 12" [moreLink]="['/c', 'trades']">
 *       <ul jb-list>…</ul>
 *     </section>
 *
 * The section is named by its heading. `count` is the figure drawn; `countLabel` is what
 * assistive technology reads in its place.
 */
@Component({
  selector: 'section[jb-directory-group]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dir-group', '[attr.aria-labelledby]': 'headingId()' },
  templateUrl: './directory-group.html',
  styleUrl: './directory-group.scss',
})
export class DirectoryGroup {
  readonly heading = input.required<string>();
  readonly headingId = input.required<string>();
  readonly count = input.required<string>();
  readonly countLabel = input.required<string>();
  readonly moreLabel = input<string | null>(null);
  readonly moreLink = input<string | readonly unknown[] | null>(null);
}
