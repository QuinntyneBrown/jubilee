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
import { BookedRequest, QuoteOptions, REQUESTS_API } from 'api';
import { Icon, Button } from 'components';
import { TimeoutError, timeout } from 'rxjs';
import { ClockService } from '../../services/clock.service';
import { isoDay, newKey } from '../../services/message-time';

export interface RequestQuoteData {
  slug: string;
  /** The service the dialog was opened from, if any. */
  serviceId: string | null;
}

type View = 'loading' | 'form' | 'busy' | 'success' | 'failed' | 'unavailable';
type Field = 'description' | 'neededBy' | 'phone';

/** A submission that takes longer than this fails instead of spinning (L2-127 AC2). */
const SUBMIT_TIMEOUT_MS = 10_000;

/**
 * RequestQuoteDialog (L2-045): describe what is needed, optionally when, a budget and a phone,
 * and send it. Nothing is charged. A retry reuses the idempotency key (L2-132); each message sits
 * under its field and focus goes to the first invalid one (L2-126).
 */
@Component({
  selector: 'jb-request-quote-dialog',
  imports: [FormsModule, RouterLink, Icon, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog', '(click)': 'closeIfOutside($event)' },
  templateUrl: './request-quote.dialog.html',
})
export class RequestQuoteDialog implements OnInit {
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly api = inject(REQUESTS_API);
  private readonly clock = inject(ClockService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<RequestQuoteData>(DIALOG_DATA);

  protected readonly view = signal<View>('loading');
  protected readonly options = signal<QuoteOptions | null>(null);
  protected readonly description = signal('');
  protected readonly neededBy = signal('');
  protected readonly budget = signal('');
  protected readonly phone = signal('');
  protected readonly problems = signal<Partial<Record<Field, string>>>({});
  protected readonly booked = signal<BookedRequest | null>(null);
  protected readonly failure = signal({ title: '', text: '' });
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly today = isoDay(this.clock.now());
  private readonly key = newKey();

  ngOnInit(): void {
    this.api.quoteOptions(this.data.slug).subscribe({
      next: (options) => {
        this.options.set(options);
        this.view.set('form');
        // The form appears after the dialog opened, so focus goes to the first field here.
        setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#d-what')?.focus());
      },
      error: () => this.view.set('unavailable'),
    });
  }

  protected send(): void {
    if (this.busy()) return;
    const options = this.options();
    if (!options) return;
    const found = this.check(options);
    this.problems.set(found);
    if (Object.keys(found).length > 0) {
      this.view.set('form');
      this.focusFirstInvalid();
      return;
    }
    this.view.set('busy');
    this.api
      .requestQuote({
        listingSlug: this.data.slug,
        serviceId: this.data.serviceId,
        description: this.description().trim(),
        neededBy: this.neededBy() || null,
        budget: this.budget().trim() || null,
        phone: this.phone().trim() || null,
        idempotencyKey: this.key,
      })
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: (booked) => {
          this.booked.set(booked);
          this.view.set('success');
        },
        error: (error: unknown) => this.fail(error, options),
      });
  }

  /** The browser's rules (QuoteFormValidators); the server repeats them (L2-126 AC4). */
  private check(options: QuoteOptions): Partial<Record<Field, string>> {
    const found: Partial<Record<Field, string>> = {};
    if (!this.description().trim())
      found.description = this.messageFor('description', 'REQUIRED', options);
    const phone = this.phone().trim();
    if (phone && phone.replace(/\D/g, '').length !== 10) {
      found.phone = this.messageFor('phone', 'INVALID_PHONE', options);
    }
    const by = this.neededBy();
    if (by && by < this.today) found.neededBy = this.messageFor('neededBy', 'IN_THE_PAST', options);
    return found;
  }

  private messageFor(field: Field, code: string, options: QuoteOptions): string {
    switch (`${field}:${code}`) {
      case 'description:REQUIRED':
        return `Describe what you need in a sentence or two so ${options.ownerFirstName} can price it.`;
      case 'phone:INVALID_PHONE':
        return 'Enter a 10-digit phone number, like 416-555-0142, or leave it empty.';
      default:
        return 'Choose a date from today on.';
    }
  }

  private fail(error: unknown, options: QuoteOptions): void {
    if (error instanceof HttpErrorResponse) {
      const code = (error.error as { code?: string } | null)?.code;
      const errors = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      if (error.status === 422) {
        const found: Partial<Record<Field, string>> = {};
        for (const field of ['description', 'neededBy', 'phone'] as Field[]) {
          if (errors[field]) found[field] = this.messageFor(field, errors[field], options);
        }
        this.problems.set(found);
        this.view.set('form');
        this.focusFirstInvalid();
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
    if (!this.busy()) this.ref.close();
  }

  protected closeIfOutside(event: Event): void {
    if (event.target === event.currentTarget) this.close();
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
