import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One step of a breadcrumb. The last step is the current page and needs no link. */
export interface BreadcrumbItem {
  label: string;
  link?: string | readonly unknown[];
}

/**
 * The trail above a page, from where the member came to where they are:
 *
 *     <nav jb-breadcrumb [items]="[{ label: 'Browse', link: '/' }, { label: name }]"></nav>
 *
 * The last item is the current page: it is not a link and carries `aria-current="page"`.
 */
@Component({
  selector: 'nav[jb-breadcrumb]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.aria-label]': 'label()' },
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
})
export class Breadcrumb {
  readonly items = input.required<readonly BreadcrumbItem[]>();
  /** The accessible name of the navigation. */
  readonly label = input('Breadcrumb');
}
