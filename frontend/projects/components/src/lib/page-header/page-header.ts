import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';

/**
 * The title block of a page: its one `h1`, a line under it and the page's actions.
 *
 *     <jb-page-header heading="Your requests" [subtitle]="subtitle()">
 *       <a jb-button routerLink="/">Browse</a>
 *     </jb-page-header>
 *
 * A subtitle that holds more than words (a badge, a link) is projected:
 * `<ng-container ngProjectAs="[slot=subtitle]">…</ng-container>`. `focusable` lets the page
 * move focus to the heading after it changes what it shows, with `focus()`.
 */
@Component({
  selector: 'jb-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page-header' },
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly focusable = input(false, { transform: booleanAttribute });

  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');

  /** Moves focus to the heading. */
  focus(): void {
    this.title().nativeElement.focus();
  }
}
