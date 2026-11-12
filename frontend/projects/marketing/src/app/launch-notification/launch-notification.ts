import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LAUNCH_API } from 'api';
import {
  Alert,
  BotChallenge,
  Checkbox,
  Field,
  FieldError,
  FormSummary,
  Input,
  LaunchConfirmation,
  LaunchForm,
  MarketingButton,
  MarketingHeading,
  MarketingSection,
} from 'components';
import { map } from 'rxjs';
import {
  challengeFailed,
  EMAIL_INVALID,
  EMAIL_PATTERN,
  FormNotice,
  keepSending,
  ROBOT,
  STILL_SENDING,
  TOO_LONG,
  tooMany,
} from '../launch-forms/launch-messages';

type FieldName = 'email' | 'firstName' | 'consent';
type View = 'form' | 'sending' | 'sent';

const MAX = { email: 254, firstName: 50 };
const IDS: Record<FieldName, string> = {
  email: 'notify-email',
  firstName: 'notify-first-name',
  consent: 'notify-consent',
};
const SUMMARY: Record<FieldName, string> = {
  email: 'Enter a valid e-mail address',
  firstName: 'Shorten your first name',
  consent: 'Say yes so that we may e-mail you',
};

/** The text of a field error, by the code the API answers with (L2-217 AC2). */
function message(field: FieldName, code: string): string {
  if (code === 'TOO_LONG') return TOO_LONG;
  if (field === 'consent') return 'Tick the box so that we may e-mail you.';
  if (code === 'REQUIRED') return 'Enter your e-mail address.';
  return EMAIL_INVALID;
}

/**
 * "Jubilee is launching soon.": anyone leaves an address to be told when Jubilee launches
 * (L2-217). A repeat is confirmed as the first time, and nothing else is sent until launch.
 */
@Component({
  selector: 'jb-launch-notification',
  imports: [
    FormsModule,
    MarketingSection,
    MarketingHeading,
    LaunchForm,
    LaunchConfirmation,
    MarketingButton,
    Alert,
    FormSummary,
    Field,
    FieldError,
    Input,
    Checkbox,
    BotChallenge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './launch-notification.html',
})
export class LaunchNotification {
  private readonly api = inject(LAUNCH_API);
  private readonly summaryRef = viewChild(FormSummary);
  private readonly confirmationRef = viewChild(LaunchConfirmation);
  private readonly challengeRef = viewChild(BotChallenge);

  protected readonly max = MAX;
  protected readonly view = signal<View>('form');
  protected readonly sending = computed(() => this.view() === 'sending');
  protected readonly email = signal('');
  protected readonly firstName = signal('');
  protected readonly consent = signal(false);
  protected readonly errors = signal<Partial<Record<FieldName, string>>>({});
  protected readonly notice = signal<FormNotice | null>(null);
  protected readonly sentTo = signal('');
  /** The bot challenge, when one is configured (L2-218 AC5). */
  protected readonly challengeSiteKey = toSignal(
    this.api.settings().pipe(map((settings) => settings.botChallengeSiteKey ?? null)),
    { initialValue: null },
  );
  protected readonly challenge = signal<string | null>(null);

  protected readonly summary = computed(() =>
    (Object.keys(this.errors()) as FieldName[]).map((field) => ({
      id: IDS[field],
      text: SUMMARY[field],
    })),
  );

  protected send(event: Event): void {
    event.preventDefault();
    if (this.sending()) return;
    const errors: Partial<Record<FieldName, string>> = {};
    const email = this.email().trim();
    if (!email) errors.email = message('email', 'REQUIRED');
    else if (!EMAIL_PATTERN.test(email)) errors.email = message('email', 'EMAIL_INVALID');
    if (!this.consent()) errors.consent = message('consent', 'CONSENT_REQUIRED');
    this.errors.set(errors);
    this.notice.set(null);
    if (Object.keys(errors).length > 0) {
      this.focusSummary();
      return;
    }

    this.view.set('sending');
    this.api
      .notify({
        email,
        firstName: this.firstName().trim(),
        consent: true,
        challengeToken: this.challenge(),
      })
      .pipe(keepSending(() => this.notice.set(STILL_SENDING)))
      .subscribe({
        next: () => {
          this.sentTo.set(email);
          this.view.set('sent');
          setTimeout(() => this.confirmationRef()?.focus());
        },
        error: (error: unknown) => this.failed(error),
      });
  }

  /** An answer the visitor can act on: every value typed stays where it was (L2-217 AC6, AC7). */
  private failed(error: unknown): void {
    this.view.set('form');
    this.notice.set(null);
    if (challengeFailed(error)) {
      // One token passes one check: ask for a fresh one (L2-137 AC2).
      this.challenge.set(null);
      this.challengeRef()?.reset();
      this.notice.set(ROBOT);
    } else if (error instanceof HttpErrorResponse && error.status === 422 && error.error?.errors) {
      const mapped: Partial<Record<FieldName, string>> = {};
      for (const [key, code] of Object.entries<string>(error.error.errors)) {
        if (key in IDS) mapped[key as FieldName] = message(key as FieldName, code);
      }
      this.errors.set(mapped);
      this.focusSummary();
    } else if (error instanceof HttpErrorResponse && error.status === 429) {
      this.notice.set(tooMany(error));
    }
  }

  private focusSummary(): void {
    setTimeout(() => this.summaryRef()?.focus());
  }
}
