import { CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Input } from '../input/input';
import { Menu } from '../menu/menu';
import { MenuLabel } from '../menu/menu-label';
import { MenuRadio } from '../menu/menu-radio';

const COUNT = new Intl.NumberFormat('en-CA');

/**
 * The pages to offer: every page up to seven; past that the first, the last and the neighbours of
 * the current one, at least five at either end, with `null` for the "…" between.
 */
export function recordsPages(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(page - 1, pages - 4));
  const end = Math.min(pages - 1, Math.max(page + 1, 5));
  const middle = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return [1, ...(start > 2 ? [null] : []), ...middle, ...(end < pages - 1 ? [null] : []), pages];
}

/**
 * The foot of a table of the admin application (L2-278 AC2 – AC4):
 *
 *     <div jb-records-foot [page]="page()" [size]="size()" [total]="total()"
 *       (pageChange)="goTo($event)" (sizeChange)="show($event)"></div>
 *
 * "{from}–{to} of {total}" and "Rows {n}", a menu "Rows per page" of the `sizes` (from 640 px);
 * then the pages: previous, the page numbers ("Page {n} of {pages}" under 640 px), next, and
 * "Go to" a page number when there are more than seven (from 1024 px). The current page is marked
 * `aria-current="page"`; previous on the first page and next on the last are disabled.
 */
@Component({
  selector: 'div[jb-records-foot]',
  imports: [CdkMenuTrigger, Button, Icon, Input, Menu, MenuLabel, MenuRadio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'records__foot' },
  templateUrl: './records-foot.html',
  styleUrl: './records-foot.scss',
})
export class RecordsFoot {
  readonly page = input.required<number>();
  readonly size = input.required<number>();
  readonly total = input.required<number>();
  readonly sizes = input<readonly number[]>([25, 50, 100, 250]);

  readonly pageChange = output<number>();
  readonly sizeChange = output<number>();

  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  protected readonly numbers = computed(() => recordsPages(this.page(), this.pages()));
  protected readonly from = computed(() => (this.page() - 1) * this.size() + 1);
  protected readonly to = computed(() => Math.min(this.page() * this.size(), this.total()));

  protected count(n: number): string {
    return COUNT.format(n);
  }

  protected go(page: number): void {
    if (page >= 1 && page <= this.pages() && page !== this.page()) this.pageChange.emit(page);
  }

  /** "Go to": a page number, held to the pages there are. */
  protected goTo(event: Event, box: HTMLInputElement): void {
    event.preventDefault();
    const page = Number.parseInt(box.value, 10);
    if (Number.isNaN(page)) return;
    this.go(Math.min(Math.max(page, 1), this.pages()));
    box.value = '';
  }
}
