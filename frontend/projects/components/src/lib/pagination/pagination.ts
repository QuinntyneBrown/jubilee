import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CountPipe } from '../format/format';

/**
 * The pages to offer: the first, the last and the neighbours of the current page, with at
 * least three at either end; `null` marks a collapsed run, shown as "…".
 */
export function pageWindow(current: number, last: number): (number | null)[] {
  const wanted = new Set([1, last, current - 1, current, current + 1]);
  if (current <= 2) [2, 3].forEach((page) => wanted.add(page));
  if (current >= last - 1) [last - 1, last - 2].forEach((page) => wanted.add(page));
  const pages = [...wanted].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);
  return pages.flatMap((page, index) =>
    index > 0 && page - pages[index - 1] > 1 ? [null, page] : [page],
  );
}

/**
 * Pagination (L2-026): "Showing 17–32 of 312" with previous, numbered and next links that
 * keep the rest of the query string. With one page it renders "Showing all {n}" alone.
 *
 *     <jb-pagination [page]="2" [pageSize]="16" [total]="312" />
 */
@Component({
  selector: 'jb-pagination',
  imports: [RouterLink, CountPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @if (last() > 1) {
      <nav
        class="cluster cluster--between"
        aria-label="Pagination"
        style="margin-top: var(--space-8)"
      >
        <span class="text-caption"
          >Showing {{ from() | jbCount }}–{{ to() | jbCount }} of {{ total() | jbCount }}</span
        >
        <ul class="pagination">
          <li>
            <a
              [routerLink]="[]"
              [queryParams]="{ page: paramFor(page() - 1) }"
              queryParamsHandling="merge"
              [attr.aria-disabled]="page() === 1 ? 'true' : null"
              [attr.tabindex]="page() === 1 ? -1 : null"
              aria-label="Previous page"
              >‹</a
            >
          </li>
          @for (item of pages(); track $index) {
            <li>
              @if (item === null) {
                <span aria-hidden="true">…</span>
              } @else {
                <a
                  [routerLink]="[]"
                  [queryParams]="{ page: paramFor(item) }"
                  queryParamsHandling="merge"
                  [attr.aria-current]="item === page() ? 'page' : null"
                  >{{ item }}</a
                >
              }
            </li>
          }
          <li>
            <a
              [routerLink]="[]"
              [queryParams]="{ page: paramFor(page() + 1) }"
              queryParamsHandling="merge"
              [attr.aria-disabled]="page() === last() ? 'true' : null"
              [attr.tabindex]="page() === last() ? -1 : null"
              aria-label="Next page"
              >›</a
            >
          </li>
        </ul>
      </nav>
    } @else {
      <p class="text-caption" style="margin-top: var(--space-6)">
        Showing all {{ total() | jbCount }}
      </p>
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();

  protected readonly last = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly pages = computed(() => pageWindow(this.page(), this.last()));
  protected readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  protected readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  /** Page 1 is the default and leaves the query string; out-of-range links stay where they are. */
  protected paramFor(page: number): number | null {
    const target = Math.min(Math.max(page, 1), this.last());
    return target === 1 ? null : target;
  }
}
