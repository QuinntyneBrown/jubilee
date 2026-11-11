import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ACCOUNT_API, JoinRequest } from 'api';
import { BrandMark, EmptyState, Icon, Button, Alert, FormSummary } from 'components';
import { SessionService } from '../../services/session.service';

type Field = 'firstName' | 'lastName' | 'email' | 'password' | 'agreement';
type View = 'form' | 'submitting' | 'success' | 'error';

const MAX = { name: 50, email: 254, password: 128, church: 100 };
const MIN_PASSWORD = 10;
const IDS: Record<Field, string> = {
  firstName: 'first',
  lastName: 'last',
  email: 'email',
  password: 'password',
  agreement: 'agree',
};
const REQUIRED_TEXT: Record<Field, string> = {
  firstName: 'Enter your first name.',
  lastName: 'Enter your last name.',
  email: 'Enter your e-mail address.',
  password: 'Enter a password.',
  agreement: 'Agree to the statement of faith to join.',
};
const SUMMARY_TEXT: Record<Field, string> = {
  firstName: 'Enter your first name',
  lastName: 'Enter your last name',
  email: 'Enter a valid e-mail address',
  password: 'Use at least 10 characters',
  agreement: 'Agree to the statement of faith to join',
};

/** The text of a field error, by the code the API answers with (L2-001). */
function message(field: Field, code: string, passwordLength: number): string {
  switch (code) {
    case 'REQUIRED':
      return REQUIRED_TEXT[field];
    case 'TOO_LONG':
      return 'This is too long.';
    case 'EMAIL_INVALID':
      return 'Enter a valid e-mail address, like name@example.com.';
    case 'EMAIL_TAKEN':
      return 'An account already uses this e-mail. Sign in instead, or use another address.';
    case 'PASSWORD_TOO_SHORT':
      return `Use at least ${MIN_PASSWORD} characters. This one has ${passwordLength}.`;
    case 'PASSWORD_BREACHED':
      return 'This password has appeared in a data breach. Choose another.';
    case 'AGREEMENT_REQUIRED':
      return REQUIRED_TEXT.agreement;
    default:
      return 'Check this and try again.';
  }
}

/** JoinPage (L2-001 to L2-003): create an account with e-mail or Google. */
@Component({
  selector: 'jb-join-page',
  imports: [FormsModule, RouterLink, BrandMark, EmptyState, Icon, Button, Alert, FormSummary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'auth-layout' },
  templateUrl: './join.page.html',
})
export class JoinPage {
  private readonly api = inject(ACCOUNT_API);
  private readonly session = inject(SessionService);
  private readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');
  private readonly summaryRef = viewChild(FormSummary);

  protected readonly max = MAX;
  protected readonly view = signal<View>('form');
  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly homeChurch = signal('');
  protected readonly agreed = signal(false);
  protected readonly errors = signal<Partial<Record<Field, string>>>({});
  protected readonly sentTo = signal('');
  protected readonly notice = signal<string | null>(null);
  protected readonly resent = signal(false);
  protected readonly googleUrl = `/api/auth/google/start${
    this.returnUrl ? `?returnUrl=${encodeURIComponent(this.returnUrl)}` : ''
  }`;

  protected readonly summary = computed(() =>
    (Object.keys(this.errors()) as Field[]).map((field) => ({
      field,
      id: IDS[field],
      text: (this.errors()[field] ?? '').startsWith('An account already')
        ? 'An account already uses this e-mail'
        : SUMMARY_TEXT[field],
    })),
  );

  protected submit(): void {
    if (this.view() === 'submitting') return;
    const errors: Partial<Record<Field, string>> = {};
    if (!this.firstName().trim()) errors.firstName = message('firstName', 'REQUIRED', 0);
    if (!this.lastName().trim()) errors.lastName = message('lastName', 'REQUIRED', 0);
    if (!this.email().trim()) errors.email = message('email', 'REQUIRED', 0);
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email().trim()))
      errors.email = message('email', 'EMAIL_INVALID', 0);
    if (!this.password()) errors.password = message('password', 'REQUIRED', 0);
    else if (this.password().length < MIN_PASSWORD)
      errors.password = message('password', 'PASSWORD_TOO_SHORT', this.password().length);
    if (!this.agreed()) errors.agreement = message('agreement', 'AGREEMENT_REQUIRED', 0);
    this.errors.set(errors);
    this.notice.set(null);
    if (Object.keys(errors).length > 0) {
      this.focusSummary();
      return;
    }

    const request: JoinRequest = {
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
      email: this.email().trim(),
      password: this.password(),
      homeChurch: this.homeChurch().trim(),
      agreementAccepted: true,
      challengeToken: null,
    };
    this.view.set('submitting');
    this.api.join(request).subscribe({
      next: (response) => {
        this.sentTo.set(response.email);
        this.view.set('success');
        this.session.resolve().subscribe();
      },
      error: (error: HttpErrorResponse) => this.failed(error),
    });
  }

  private failed(error: HttpErrorResponse): void {
    this.view.set('form');
    if (error.status === 422 && error.error?.errors) {
      const mapped: Partial<Record<Field, string>> = {};
      for (const [key, code] of Object.entries<string>(error.error.errors)) {
        const field = (key === 'challenge' ? 'email' : key) as Field;
        if (field in IDS) mapped[field] = message(field, code, this.password().length);
      }
      this.errors.set(mapped);
      this.focusSummary();
    } else if (error.status === 429) {
      const seconds = Number(error.headers.get('Retry-After')) || 3600;
      const minutes = Math.max(1, Math.ceil(seconds / 60));
      this.notice.set(
        `You’re doing that a lot. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      );
    } else {
      this.view.set('error');
    }
  }

  protected retry(): void {
    this.view.set('form');
  }

  protected resend(): void {
    this.api.resendConfirmation().subscribe({
      next: () => this.resent.set(true),
      error: () => this.notice.set('We couldn’t send it. Try again in a moment.'),
    });
  }

  private focusSummary(): void {
    setTimeout(() => this.summaryRef()?.focus());
  }
}
