import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { Skeleton } from '../skeleton/skeleton';

export type FeedbackHistoryKind = 'rating' | 'bug-report' | 'kudos';

/** One item of `jb-feedback-history`, in the words it is shown with. */
export interface FeedbackHistoryItem {
  id: string;
  kind: FeedbackHistoryKind;
  title: string;
  /** The date as it is read ("Fri 6 Nov") and as a machine reads it. */
  date: string;
  dateTime: string;
  reference: string | null;
  /** The status in words; it is never told by colour. */
  status: string;
  reply: string | null;
}

const KIND: Record<FeedbackHistoryKind, { icon: IconName; label: string }> = {
  rating: { icon: 'star', label: 'Rating' },
  'bug-report': { icon: 'bug', label: 'Bug report' },
  kudos: { icon: 'heart', label: 'Kudos' },
};

/**
 * "Your feedback" (L2-213): what the member sent, newest first, each with the icon of its kind,
 * a title, a line of date, reference and status in words, and the team's reply under it.
 *
 *     <section jb-feedback-history [state]="state()" [items]="items()" (retry)="load()"></section>
 *
 * `loading` shows skeleton rows, `error` an alert with "Try again"; a loaded list without items
 * says what will show there.
 */
@Component({
  selector: 'section[jb-feedback-history]',
  imports: [Alert, Button, Icon, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feedback-history', '[attr.aria-labelledby]': 'headingId()' },
  templateUrl: './feedback-history.html',
  styleUrl: './feedback-history.scss',
})
export class FeedbackHistory {
  readonly state = input.required<'loading' | 'error' | 'loaded'>();
  readonly items = input<readonly FeedbackHistoryItem[]>([]);
  readonly headingId = input('feedback-history-heading');
  /** "Try again" was pressed. */
  readonly retry = output<void>();

  protected readonly kinds = KIND;
  protected readonly placeholders = [0, 1, 2];
}
