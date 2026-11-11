import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BrandMark, EmptyState, Icon, Button } from 'components';
import { sanitiseReturnUrl } from '../../services/return-url';
import { SessionService } from '../../services/session.service';
import { ToastService } from '../../toasts/toast.service';

type Field = 'email' | 'password';
type View = 'form' | 'submitting' | 'error';

const GOOGLE_ERRORS: Record<string, string> = {
  google: 'We couldn’t sign you in with Google. Try again, or use your e-mail and password.',
  'google-email':
    'Google didn’t confirm that e-mail address. Use your e-mail and password instead.',
};

/** SignInPage (L2-006, L2-007): e-mail and password, or Google, then back to where the visitor was. */
@Component({
  selector: 'jb-sign-in-page',
  imports: [FormsModule, RouterLink, BrandMark, EmptyState, Icon, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'auth-layout' },
  templateUrl: './sign-in.page.html',
})
export class SignInPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  private readonly summaryRef = viewChild<ElementRef<HTMLElement>>('summaryBox');

  protected readonly returnUrl = sanitiseReturnUrl(this.query.get('returnUrl'));
  protected readonly googleUrl = `/api/auth/google/start?returnUrl=${encodeURIComponent(this.returnUrl)}`;
  protected readonly joinQuery = { returnUrl: this.returnUrl };
  protected readonly view = signal<View>('form');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly keep = signal(false);
  protected readonly errors = signal<Partial<Record<Field, string>>>({});
  protected readonly notice = signal<string | null>(
    GOOGLE_ERRORS[this.query.get('error') ?? ''] ?? null,
  );

  protected readonly summary = computed(() => {
    const errors = this.errors();
    const list: { id: Field; text: string }[] = [];
    if (errors.email) list.push({ id: 'email', text: 'Enter the e-mail address you joined with' });
    if (errors.password) {
      list.push({
        id: 'password',
        text: errors.password.startsWith('That password')
          ? 'That password doesn’t match this e-mail'
          : 'Enter your password',
      });
    }
    return list;
  });

  protected submit(): void {
    if (this.view() === 'submitting') return;
    const errors: Partial<Record<Field, string>> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email().trim())) {
      errors.email = 'Enter the e-mail address you joined with, like name@example.com';
    }
    if (!this.password()) errors.password = 'Enter your password.';
    this.errors.set(errors);
    this.notice.set(null);
    if (Object.keys(errors).length > 0) {
      this.focusSummary();
      return;
    }

    this.view.set('submitting');
    this.session
      .signIn({ email: this.email().trim(), password: this.password(), keepSignedIn: this.keep() })
      .subscribe({
        next: () => {
          const member = this.session.member();
          if (member)
            this.toasts.show({ tone: 'success', title: `Welcome back, ${member.firstName}` });
          void this.router.navigateByUrl(this.returnUrl);
        },
        error: (error: HttpErrorResponse) => this.failed(error),
      });
  }

  private failed(error: HttpErrorResponse): void {
    this.view.set('form');
    const code = error.error?.code;
    if (error.status === 401 && code === 'INVALID_CREDENTIALS') {
      this.errors.set({
        password: 'That password doesn’t match this e-mail. Try again or reset it.',
      });
      this.focusSummary();
    } else if (error.status === 422 && error.error?.errors?.email) {
      this.errors.set({ email: 'Enter the e-mail address you joined with, like name@example.com' });
      this.focusSummary();
    } else if (error.status === 429 && code === 'SIGN_IN_LOCKED') {
      this.notice.set('Too many tries. Wait 15 minutes or reset your password.');
    } else if (error.status === 429) {
      const minutes = Math.max(
        1,
        Math.ceil((Number(error.headers.get('Retry-After')) || 900) / 60),
      );
      this.notice.set(
        `You’re doing that a lot. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      );
    } else {
      this.view.set('error');
    }
  }

  protected focusField(id: string): void {
    document.getElementById(id)?.focus();
  }

  protected retry(): void {
    this.view.set('form');
  }

  private focusSummary(): void {
    setTimeout(() => this.summaryRef()?.nativeElement.focus());
  }
}
