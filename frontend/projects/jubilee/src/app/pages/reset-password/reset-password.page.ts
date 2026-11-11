import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PASSWORD_RESET_API } from 'api';
import {
  BrandMark,
  EmptyState,
  Icon,
  Button,
  FormSummary,
  Field,
  Input,
  Skeleton,
  Card,
} from 'components';

type View = 'loading' | 'form' | 'submitting' | 'success' | 'expired' | 'error';
type FieldName = 'password' | 'confirm';

const MIN_PASSWORD = 10;
const MAX_PASSWORD = 128;
const IDS: Record<FieldName, string> = { password: 'password', confirm: 'confirm' };
const SUMMARY: Record<string, string> = {
  PASSWORD_TOO_SHORT: 'Use at least 10 characters',
  PASSWORD_BREACHED: 'Choose a password that has not been in a data breach',
  REQUIRED: 'Enter a new password',
  TOO_LONG: 'Use at most 128 characters',
  PASSWORDS_DIFFER: 'The two passwords don\u2019t match',
};

function text(code: string, length: number): string {
  switch (code) {
    case 'PASSWORD_TOO_SHORT':
      return `Use at least ${MIN_PASSWORD} characters. This one has ${length}.`;
    case 'PASSWORD_BREACHED':
      return 'This password has appeared in a data breach. Choose another.';
    case 'PASSWORDS_DIFFER':
      return 'The two passwords don\u2019t match. Type the same password again.';
    case 'TOO_LONG':
      return `Use at most ${MAX_PASSWORD} characters.`;
    case 'REQUIRED':
      return 'Enter a new password.';
    default:
      return 'Check this and try again.';
  }
}

/**
 * ResetPasswordPage (L2-009): the page a reset link opens. The token is taken out of the address bar as soon
 * as it is read, and travels to the API in a request body only (L2-140 AC2).
 */
@Component({
  selector: 'jb-reset-password-page',
  imports: [
    FormsModule,
    RouterLink,
    BrandMark,
    EmptyState,
    Icon,
    Button,
    FormSummary,
    Field,
    Input,
    Skeleton,
    Card,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'auth-layout' },
  templateUrl: './reset-password.page.html',
})
export class ResetPasswordPage implements OnInit {
  private readonly api = inject(PASSWORD_RESET_API);
  private readonly document = inject(DOCUMENT);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  private readonly summaryRef = viewChild(FormSummary);

  protected readonly view = signal<View>('loading');
  protected readonly accountEmail = signal('');
  protected readonly password = signal('');
  protected readonly repeat = signal('');
  protected readonly errors = signal<Partial<Record<FieldName, { code: string; text: string }>>>(
    {},
  );

  protected readonly summary = computed(() =>
    (Object.keys(this.errors()) as FieldName[]).map((field) => ({
      id: IDS[field],
      text: SUMMARY[this.errors()[field]?.code ?? ''] ?? 'Check this field',
    })),
  );

  ngOnInit(): void {
    this.document.defaultView?.history.replaceState(null, '', '/reset-password');
    this.inspect();
  }

  protected inspect(): void {
    this.view.set('loading');
    this.api.inspectLink(this.token).subscribe({
      next: (link) => {
        if (link.state === 'valid') {
          this.accountEmail.set(link.email ?? '');
          this.view.set('form');
        } else {
          this.view.set('expired');
        }
      },
      error: () => this.view.set('error'),
    });
  }

  protected submit(): void {
    if (this.view() === 'submitting') return;
    const errors: Partial<Record<FieldName, { code: string; text: string }>> = {};
    const length = this.password().length;
    if (length === 0) errors.password = { code: 'REQUIRED', text: text('REQUIRED', 0) };
    else if (length < MIN_PASSWORD)
      errors.password = { code: 'PASSWORD_TOO_SHORT', text: text('PASSWORD_TOO_SHORT', length) };
    else if (length > MAX_PASSWORD)
      errors.password = { code: 'TOO_LONG', text: text('TOO_LONG', length) };
    if (this.repeat() !== this.password())
      errors.confirm = { code: 'PASSWORDS_DIFFER', text: text('PASSWORDS_DIFFER', 0) };
    this.errors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.focusSummary();
      return;
    }

    this.view.set('submitting');
    this.api
      .resetPassword({
        token: this.token,
        newPassword: this.password(),
        repeatPassword: this.repeat(),
      })
      .subscribe({
        next: () => {
          this.password.set('');
          this.repeat.set('');
          this.view.set('success');
        },
        error: (failure: HttpErrorResponse) => this.failed(failure),
      });
  }

  private failed(failure: HttpErrorResponse): void {
    if (failure.status === 410) {
      this.view.set('expired');
    } else if (failure.status === 422 && failure.error?.errors) {
      const mapped: Partial<Record<FieldName, { code: string; text: string }>> = {};
      for (const [key, code] of Object.entries<string>(failure.error.errors)) {
        const field: FieldName = key === 'repeatPassword' ? 'confirm' : 'password';
        mapped[field] = { code, text: text(code, this.password().length) };
      }
      this.errors.set(mapped);
      this.view.set('form');
      this.focusSummary();
    } else {
      this.errors.set({});
      this.view.set('error');
    }
  }

  private focusSummary(): void {
    setTimeout(() => this.summaryRef()?.focus());
  }
}
