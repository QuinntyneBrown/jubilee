import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';

/** One tab of `jb-tabs`: a page of a group of pages. */
export interface TabItem {
  key: string;
  label: string;
  link: string | readonly unknown[];
  /** A count beside the label, with the words that say what it counts. */
  count?: { value: number; label: string } | null;
}

/**
 * The pages of one group, side by side: `<nav jb-tabs label="Account sections" [items]="tabs"
 * current="profile"></nav>`. Each tab is a link; the current one says so with
 * `aria-current="page"`.
 */
@Component({
  selector: 'nav[jb-tabs]',
  imports: [RouterLink, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tabs', '[attr.aria-label]': 'label()' },
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
})
export class Tabs {
  /** The accessible name of the navigation. */
  readonly label = input.required<string>();
  readonly items = input.required<readonly TabItem[]>();
  /** The `key` of the page the member is on. */
  readonly current = input<string | null>(null);
}
