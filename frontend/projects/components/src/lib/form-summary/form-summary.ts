import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Alert } from '../alert/alert';

/** One invalid field: the id of its control and what to do about it. */
export interface FormSummaryError {
  readonly id: string;
  readonly text: string;
}

/**
 * The error summary at the top of a form: a danger alert that lists what to fix, each line a
 * link that moves focus to its field.
 *
 *     @if (errors().length) {
 *       <jb-form-summary [errors]="errors()" />
 *     }
 *
 * After a failed submit the page calls `focus()` so that a screen reader starts at the summary.
 * The heading counts the errors unless `heading` says something else.
 */
@Component({
  selector: 'jb-form-summary',
  imports: [Alert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form-summary.html',
  styleUrl: './form-summary.scss',
})
export class FormSummary {
  private readonly document = inject(DOCUMENT);
  private readonly box = viewChild.required('box', { read: ElementRef<HTMLElement> });

  readonly errors = input.required<readonly FormSummaryError[]>();
  readonly heading = input<string | null>(null);
  /** The id of the summary itself, for a page that links to it. */
  readonly summaryId = input('summary');

  protected readonly shownHeading = computed(() => {
    const count = this.errors().length;
    return this.heading() ?? `Fix ${count} ${count === 1 ? 'thing' : 'things'} to continue`;
  });

  /** Moves focus to the summary. */
  focus(): void {
    this.box().nativeElement.focus();
  }

  protected goTo(event: Event, id: string): void {
    event.preventDefault();
    this.document.getElementById(id)?.focus();
  }
}
