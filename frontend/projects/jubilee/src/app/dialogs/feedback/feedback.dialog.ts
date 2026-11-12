import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FEEDBACK_API, FeedbackItem, KUDOS_CHIPS, KudosChip, newKey, RATING_WORDS } from 'api';
import {
  Alert,
  Button,
  Chip,
  DialogBody,
  DialogFooter,
  DialogFrame,
  Field,
  Icon,
  StarScale,
  TabList,
  TabListItem,
  Textarea,
} from 'components';
import { Observable, timeout } from 'rxjs';
import { APP_VERSION } from '../../app-version';
import { SessionService } from '../../services/session.service';
import {
  FeedbackFailure,
  feedbackFailure,
  NOTE_MAX,
  screenName,
  SUBMIT_TIMEOUT_MS,
} from './feedback-words';

export interface FeedbackDialogData {
  /** The `page` of the route the member was on when the panel opened. */
  page: string;
}

export type FeedbackTab = 'rate' | 'bug' | 'kudos';

type View = 'form' | 'busy' | 'failed' | 'sent';

const TABS: TabListItem<FeedbackTab>[] = [
  { key: 'rate', label: 'Rate', icon: 'star' },
  { key: 'bug', label: 'Report a bug', icon: 'bug' },
  { key: 'kudos', label: 'Kudos', icon: 'heart' },
];

const SEND: Record<FeedbackTab, string> = {
  rate: 'Send rating',
  bug: 'Send report',
  kudos: 'Send kudos',
};

/**
 * FeedbackDialog (L2-210): the short panel behind the launcher. A member rates Jubilee, reports
 * a bug or sends kudos without leaving the screen. A retry reuses the idempotency key of the
 * send it repeats (L2-132) and a failure keeps what was chosen and typed (L2-128).
 */
@Component({
  selector: 'jb-feedback-dialog',
  imports: [
    FormsModule,
    RouterLink,
    Alert,
    Button,
    Chip,
    DialogBody,
    DialogFooter,
    DialogFrame,
    Field,
    Icon,
    StarScale,
    TabList,
    Textarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feedback.dialog.html',
})
export class FeedbackDialog {
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly api = inject(FEEDBACK_API);
  private readonly session = inject(SessionService);
  private readonly data = inject<FeedbackDialogData>(DIALOG_DATA);
  protected readonly version = inject(APP_VERSION);

  protected readonly tabs = TABS;
  protected readonly words = RATING_WORDS;
  protected readonly kudosChips = KUDOS_CHIPS;
  protected readonly noteMax = NOTE_MAX;
  protected readonly screen = screenName(this.data.page);
  protected readonly tab = signal<FeedbackTab>('rate');
  protected readonly view = signal<View>('form');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly failure = signal<FeedbackFailure>({ title: '', text: '' });

  protected readonly rating = signal<number | null>(null);
  protected readonly ratingNote = signal('');
  protected readonly ratingPrompt = computed(() =>
    (this.rating() ?? 0) >= 4
      ? 'What’s working well? (optional)'
      : 'What would make it better? (optional)',
  );
  protected readonly happened = signal('');
  protected readonly chips = signal<readonly KudosChip[]>([]);
  protected readonly kudosNote = signal('');

  protected readonly sendLabel = computed(() => SEND[this.tab()]);
  protected readonly canSend = computed(() => {
    switch (this.tab()) {
      case 'rate':
        return this.rating() !== null;
      case 'bug':
        return this.happened().trim().length > 0;
      default:
        return this.chips().length > 0 || this.kudosNote().trim().length > 0;
    }
  });

  protected readonly heading = computed(() => {
    if (this.view() !== 'sent') return 'Tell us how it’s going';
    const firstName = this.session.member()?.firstName;
    return firstName ? `Thank you, ${firstName}.` : 'Thank you.';
  });
  protected readonly thanks = signal('');

  /** The key of the send of each tab; a retry of that send reuses it (L2-132). */
  private readonly keys: Record<FeedbackTab, string> = {
    rate: newKey(),
    bug: newKey(),
    kudos: newKey(),
  };

  protected choose(tab: FeedbackTab): void {
    if (this.busy() || tab === this.tab()) return;
    this.tab.set(tab);
    this.view.set('form');
  }

  protected toggle(chip: KudosChip): void {
    this.chips.update((chosen) =>
      chosen.includes(chip) ? chosen.filter((other) => other !== chip) : [...chosen, chip],
    );
  }

  protected send(): void {
    if (this.busy() || !this.canSend()) return;
    this.view.set('busy');
    this.request()
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: (item) => {
          this.thanks.set(thanksFor(item));
          this.view.set('sent');
        },
        error: (error: unknown) => {
          this.failure.set(feedbackFailure(error));
          this.view.set('failed');
        },
      });
  }

  private request(): Observable<FeedbackItem> {
    switch (this.tab()) {
      case 'rate': {
        const note = this.ratingNote().trim();
        return this.api.sendRating(
          { rating: this.rating() ?? 0, ...(note ? { note } : {}) },
          this.keys.rate,
        );
      }
      case 'bug':
        return this.api.sendBugReport(
          { happened: this.happened().trim(), screen: this.data.page, version: this.version },
          this.keys.bug,
        );
      default: {
        const note = this.kudosNote().trim();
        // The chips travel in the order the panel shows them.
        const chips = KUDOS_CHIPS.map((chip) => chip.value).filter((chip) =>
          this.chips().includes(chip),
        );
        return this.api.sendKudos({ chips, ...(note ? { note } : {}) }, this.keys.kudos);
      }
    }
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}

/** What the panel says under "Thank you" (L2-210 AC7). */
function thanksFor(item: FeedbackItem): string {
  switch (item.kind) {
    case 'rating':
      return 'Every rating is read, and it shapes what we build next.';
    case 'bug-report':
      return `Logged as ${item.reference ?? 'a bug report'}. Follow it under Your feedback.`;
    default:
      return 'We’ll pass it on to the team. Notes like this keep us going.';
  }
}
