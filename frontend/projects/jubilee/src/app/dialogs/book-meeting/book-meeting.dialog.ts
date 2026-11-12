import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookedRequest, BookingOptions, MeetingMode, REQUESTS_API } from 'api';
import {
  Button,
  Alert,
  Field,
  FieldError,
  Input,
  Select,
  Textarea,
  ChipOption,
  DialogFrame,
  DialogBody,
  DialogFooter,
  MomentCheck,
} from 'components';
import { TimeoutError, timeout } from 'rxjs';
import { ClockService } from 'api';
import { isoDay, newKey, slotLabel } from 'api';
import { momentCheckIn } from '../../services/moment-check-in';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

export interface BookMeetingData {
  slug: string;
  /** The service the dialog was opened from; the first bookable one otherwise. */
  serviceId: string | null;
}

type View = 'loading' | 'form' | 'busy' | 'success' | 'failed' | 'unavailable';

/** A submission that takes longer than this fails instead of spinning (L2-127 AC2). */
const SUBMIT_TIMEOUT_MS = 10_000;

/**
 * BookMeetingDialog (L2-044): choose a service, a day, how to meet and a time, add a note and
 * send the request. Nothing is charged. A retry reuses the idempotency key (L2-132).
 */
@Component({
  selector: 'jb-book-meeting-dialog',
  imports: [
    FormDraftDirective,
    FormsModule,
    RouterLink,
    Button,
    Alert,
    Field,
    FieldError,
    Input,
    Select,
    Textarea,
    ChipOption,
    DialogFrame,
    DialogBody,
    DialogFooter,
    MomentCheck,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-meeting.dialog.html',
})
export class BookMeetingDialog implements OnInit {
  /** The one question of the confirmation (L2-211). */
  protected readonly checkIn = momentCheckIn('request-sent');
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly api = inject(REQUESTS_API);
  private readonly clock = inject(ClockService);
  protected readonly data = inject<BookMeetingData>(DIALOG_DATA);

  protected readonly view = signal<View>('loading');
  protected readonly options = signal<BookingOptions | null>(null);
  protected readonly serviceId = signal('');
  protected readonly day = signal('');
  protected readonly mode = signal<MeetingMode>('video');
  protected readonly time = signal('');
  protected readonly note = signal('');
  protected readonly slots = signal<string[]>([]);
  protected readonly loadingSlots = signal(false);
  protected readonly dayProblem = signal('');
  protected readonly timeProblem = signal('');
  protected readonly booked = signal<BookedRequest | null>(null);
  protected readonly failure = signal({ title: '', text: '' });
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly today = isoDay(this.clock.now());
  protected readonly lastDay = isoDay(
    new Date(this.clock.now().getTime() + 180 * 24 * 60 * 60 * 1000),
  );
  protected readonly label = slotLabel;
  private readonly key = newKey();

  protected readonly serviceLabel = (service: BookingOptions['services'][number]): string =>
    [service.name, service.detail, service.priceKind === 'free' ? 'Free' : null]
      .filter(Boolean)
      .join(' · ');

  ngOnInit(): void {
    this.api.bookingOptions(this.data.slug).subscribe({
      next: (options) => {
        this.options.set(options);
        const chosen =
          options.services.find((s) => s.id === this.data.serviceId) ?? options.services[0];
        if (!chosen) {
          this.view.set('unavailable');
          return;
        }
        this.serviceId.set(chosen.id);
        this.view.set('form');
      },
      error: () => {
        this.failure.set(SEND_FAILED);
        this.view.set('unavailable');
      },
    });
  }

  protected pickService(id: string): void {
    this.serviceId.set(id);
    this.loadSlots();
  }

  protected pickDay(day: string): void {
    this.day.set(day);
    this.dayProblem.set('');
    this.loadSlots();
  }

  protected pickMode(mode: string): void {
    this.mode.set(mode as MeetingMode);
  }

  private loadSlots(): void {
    this.time.set('');
    this.slots.set([]);
    const day = this.day();
    if (!day) return;
    this.loadingSlots.set(true);
    this.api.availability(this.data.slug, this.serviceId(), day).subscribe({
      next: (answer) => {
        if (day !== this.day()) return;
        this.loadingSlots.set(false);
        this.slots.set(answer.slots);
        if (!answer.available) this.dayProblem.set(this.unavailableText());
      },
      error: () => this.loadingSlots.set(false),
    });
  }

  protected send(): void {
    if (this.busy()) return;
    const options = this.options();
    if (!options) return;
    this.dayProblem.set(this.day() ? this.dayProblem() : this.requiredDayText());
    this.timeProblem.set(this.time() ? '' : 'Choose a time.');
    if (!this.day() || !this.time() || this.dayProblem()) {
      this.view.set('form');
      return;
    }
    this.view.set('busy');
    this.api
      .bookMeeting({
        listingSlug: this.data.slug,
        serviceId: this.serviceId(),
        day: this.day(),
        time: this.time(),
        mode: this.mode(),
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

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      const code = (error.error as { code?: string } | null)?.code;
      const errors = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      if (error.status === 422 && (errors['day'] || errors['time'])) {
        // The day or time is no longer offered: show the field and fetch what is left.
        this.view.set('form');
        if (errors['day']) this.dayProblem.set(this.unavailableText());
        else this.timeProblem.set('That time is no longer available. Choose another.');
        this.loadSlots();
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

  protected requiredDayText(): string {
    const options = this.options();
    return `Choose a day. ${options?.ownerFirstName} meets ${options?.meetsOn}.`;
  }

  private unavailableText(): string {
    const options = this.options();
    return `${options?.ownerFirstName} can’t meet on that day. ${options?.ownerFirstName} meets ${options?.meetsOn}.`;
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
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
