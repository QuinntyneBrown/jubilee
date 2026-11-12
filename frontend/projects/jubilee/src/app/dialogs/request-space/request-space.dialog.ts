import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookedRequest, ClockService, REQUESTS_API, SpaceTerm, isoDay, newKey } from 'api';
import {
  Alert,
  Button,
  Card,
  DescriptionItem,
  DescriptionList,
  DialogBody,
  DialogFrame,
  DialogFooter,
  Field,
  Input,
  Select,
  Textarea,
  formatRent,
} from 'components';
import { TimeoutError, timeout } from 'rxjs';

/** What the dialog knows of the space from its page: no extra read is needed. */
export interface RequestSpaceData {
  slug: string;
  name: string;
  neighbourhood: string;
  term: SpaceTerm;
  /** Whole dollars per night or per month. */
  rent: number;
  /** Nights or months. */
  minimumStay: number;
  /** "2 nights", "12-month lease". */
  minimumStayLabel: string;
  /** "Request to book", "Request a viewing" or "Meet the household". */
  callToAction: string;
  hostFirstName: string;
  /** "usually within a day". */
  replies: string;
}

type View = 'form' | 'busy' | 'success' | 'failed';
type FieldName = 'checkIn' | 'checkOut' | 'moveIn' | 'stayMonths' | 'note';

/** The lengths of stay a monthly term offers (L2-205 AC4), in months. */
export const STAY_CHOICES: readonly { months: number; value: string; label: string }[] = [
  { months: 1, value: '1', label: 'Month to month' },
  { months: 4, value: '4', label: '4 months' },
  { months: 6, value: '6', label: '6 months' },
  { months: 8, value: '8', label: '8 months' },
  { months: 12, value: '12', label: '12 months' },
  { months: 18, value: '18', label: '18 months' },
];

/** A date can be asked for this far ahead at most (L2-205 AC5). */
const MAX_DAYS_AHEAD = 365;
const MAX_NOTE = 1000;
const DAY_MS = 86_400_000;
/** A submission that takes longer than this fails instead of spinning (L2-127 AC2). */
const SUBMIT_TIMEOUT_MS = 10_000;

/**
 * RequestSpaceDialog (L2-205): a Short stay asks for its check-in and check-out and totals the
 * stay; any other term asks for the move-in and how long. Nothing is charged, and no price is
 * sent: the server computes it (AC8). A retry reuses the idempotency key (L2-132); each message
 * sits under its field and focus goes to the first invalid one (L2-126).
 */
@Component({
  selector: 'jb-request-space-dialog',
  imports: [
    FormsModule,
    RouterLink,
    Alert,
    Button,
    Card,
    DescriptionItem,
    DescriptionList,
    DialogBody,
    DialogFrame,
    DialogFooter,
    Field,
    Input,
    Select,
    Textarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './request-space.dialog.html',
})
export class RequestSpaceDialog implements OnInit {
  /** Closes with the id of the request once one was sent. */
  private readonly ref = inject<DialogRef<string>>(DialogRef);
  private readonly api = inject(REQUESTS_API);
  private readonly clock = inject(ClockService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<RequestSpaceData>(DIALOG_DATA);

  protected readonly nightly = this.data.term === 'short-stay';
  protected readonly stayChoices = STAY_CHOICES;
  protected readonly view = signal<View>('form');
  protected readonly checkIn = signal('');
  protected readonly checkOut = signal('');
  protected readonly moveIn = signal('');
  /** The months chosen, as the select holds them; the shortest stay the space takes at first. */
  protected readonly stayMonths = signal(
    (STAY_CHOICES.find((c) => c.months >= this.data.minimumStay) ?? STAY_CHOICES[0]).value,
  );
  protected readonly note = signal('');
  protected readonly problems = signal<Partial<Record<FieldName, string>>>({});
  protected readonly booked = signal<BookedRequest | null>(null);
  protected readonly failure = signal({ title: '', text: '' });
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly today = isoDay(this.clock.now());
  protected readonly lastDay = isoDay(
    new Date(this.clock.now().getTime() + MAX_DAYS_AHEAD * DAY_MS),
  );
  private readonly key = newKey();

  /** The nights between two valid dates of a Short stay; null until there are some (AC3). */
  protected readonly nights = computed(() => {
    const from = this.checkIn();
    const to = this.checkOut();
    if (!this.nightly || !from || !to || to <= from) return null;
    return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
  });

  protected readonly amounts = computed(() => {
    const nights = this.nights();
    if (nights === null) return null;
    const total = formatRent(nights * this.data.rent);
    return {
      line: `${formatRent(this.data.rent)} × ${nights} ${nights === 1 ? 'night' : 'nights'}`,
      total,
    };
  });

  protected readonly sentText = computed(
    () =>
      `You’ll hear back in Messages, ${this.data.replies}. The exact address is shared once they accept.`,
  );

  ngOnInit(): void {
    // The first field takes the focus once the dialog has opened.
    setTimeout(() =>
      this.host.nativeElement
        .querySelector<HTMLElement>(this.nightly ? '#d-in' : '#d-move')
        ?.focus(),
    );
  }

  protected send(): void {
    if (this.busy()) return;
    const found = this.check();
    this.problems.set(found);
    if (Object.keys(found).length > 0) {
      this.view.set('form');
      this.focusFirstInvalid();
      return;
    }
    this.view.set('busy');
    this.api
      .requestSpace({
        listingSlug: this.data.slug,
        checkIn: this.nightly ? this.checkIn() : null,
        checkOut: this.nightly ? this.checkOut() : null,
        moveIn: this.nightly ? null : this.moveIn(),
        stayMonths: this.nightly ? null : Number(this.stayMonths()),
        note: this.note().trim() || null,
        idempotencyKey: this.key,
      })
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: (booked) => {
          this.booked.set(booked);
          this.view.set('success');
        },
        error: (error: unknown) => this.fail(error),
      });
  }

  /** The browser's rules; the server repeats them (L2-205 AC5, AC6). */
  private check(): Partial<Record<FieldName, string>> {
    const found: Partial<Record<FieldName, string>> = {};
    const day = (field: FieldName, value: string): void => {
      if (!value) found[field] = this.messageFor(field, 'REQUIRED');
      else if (value < this.today) found[field] = this.messageFor(field, 'IN_THE_PAST');
      else if (value > this.lastDay) found[field] = this.messageFor(field, 'TOO_FAR');
    };
    if (this.nightly) {
      day('checkIn', this.checkIn());
      day('checkOut', this.checkOut());
      const nights = this.nights();
      if (!found.checkOut && this.checkIn() && this.checkOut() && nights === null) {
        found.checkOut = this.messageFor('checkOut', 'NOT_AFTER_CHECK_IN');
      } else if (!found.checkOut && nights !== null && nights < this.data.minimumStay) {
        found.checkOut = this.messageFor('checkOut', 'BELOW_MINIMUM_STAY');
      }
    } else {
      day('moveIn', this.moveIn());
      if (Number(this.stayMonths()) < this.data.minimumStay) {
        found.stayMonths = this.messageFor('stayMonths', 'BELOW_MINIMUM_STAY');
      }
    }
    if (this.note().trim().length > MAX_NOTE) found.note = this.messageFor('note', 'TOO_LONG');
    return found;
  }

  private messageFor(field: FieldName, code: string): string {
    switch (code) {
      case 'REQUIRED':
        return field === 'checkIn'
          ? 'Choose a check-in date.'
          : field === 'checkOut'
            ? 'Choose a check-out date.'
            : field === 'moveIn'
              ? 'Choose a move-in date.'
              : 'Choose how long you’re staying.';
      case 'IN_THE_PAST':
        return 'Choose a date from today on.';
      case 'NOT_AFTER_CHECK_IN':
        return 'Choose a check-out after check-in.';
      case 'TOO_FAR':
        return 'Choose a date within the next year.';
      case 'BELOW_MINIMUM_STAY':
        return this.nightly
          ? `This space needs at least ${this.data.minimumStayLabel}.`
          : `This space needs at least ${this.data.minimumStay} months.`;
      case 'TOO_LONG':
        return 'Keep the note to 1,000 characters.';
      default:
        return 'Check this and try again.';
    }
  }

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      const code = (error.error as { code?: string } | null)?.code;
      const errors = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      if (error.status === 422) {
        const found: Partial<Record<FieldName, string>> = {};
        for (const field of [
          'checkIn',
          'checkOut',
          'moveIn',
          'stayMonths',
          'note',
        ] as FieldName[]) {
          if (errors[field]) found[field] = this.messageFor(field, errors[field]);
        }
        this.problems.set(found);
        this.view.set('form');
        this.focusFirstInvalid();
        return;
      }
      if (error.status === 409 && code === 'ALREADY_REQUESTED') {
        this.failure.set({
          title: 'You’ve already asked for this space',
          text: `Your request is with ${this.data.hostFirstName}. You’ll find it in Your requests.`,
        });
        this.view.set('failed');
        return;
      }
      if (error.status === 409 && code === 'OWN_LISTING') {
        this.failure.set({
          title: 'This is your own space',
          text: 'You can’t send a request to yourself.',
        });
        this.view.set('failed');
        return;
      }
      if (error.status === 403 && code === 'EMAIL_UNCONFIRMED') {
        this.failure.set({
          title: 'Confirm your e-mail first',
          text: 'We sent you a link when you joined. Open it, then send your request. What you typed is still here.',
        });
        this.view.set('failed');
        return;
      }
    }
    this.failure.set(error instanceof TimeoutError ? TOO_SLOW : SEND_FAILED);
    this.view.set('failed');
  }

  private focusFirstInvalid(): void {
    setTimeout(() =>
      this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );
  }

  protected close(): void {
    if (!this.busy()) this.ref.close(this.booked()?.id);
  }
}

const SEND_FAILED = {
  title: 'We couldn’t send that',
  text: 'Your connection dropped before it reached us. Nothing was sent and what you typed is still here. Try again.',
};

const TOO_SLOW = {
  title: 'We couldn’t send that',
  text: 'It took too long, so we stopped. Nothing was sent and what you typed is still here. Try again.',
};
