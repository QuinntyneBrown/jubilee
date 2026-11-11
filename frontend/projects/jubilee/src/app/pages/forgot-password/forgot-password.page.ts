import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PASSWORD_RESET_API } from 'api';
import { BrandMark, EmptyState, Icon } from 'components';

type View = 'form' | 'submitting' | 'success' | 'error';

const MALFORMED = 'Enter an e-mail address like name@example.com';

/**
 * ForgotPasswordPage (L2-008): asks for a reset link. Whatever the address, the page says the same thing
 * afterwards, so it never tells whether an account exists (L2-141).
 */
@Component({
  selector: 'jb-forgot-password-page',
  imports: [FormsModule, RouterLink, BrandMark, EmptyState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'auth-layout' },
  templateUrl: './forgot-password.page.html',
})
export class ForgotPasswordPage {
  private readonly api = inject(PASSWORD_RESET_API);
  private readonly summaryRef = viewChild<ElementRef<HTMLElement>>('summaryBox');

  protected readonly view = signal<View>('form');
  protected readonly email = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly sentTo = signal('');
  protected readonly notice = signal<string | null>(null);

  protected submit(): void {
    if (this.view() === 'submitting') return;
    const address = this.email().trim();
    this.notice.set(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      this.error.set(MALFORMED);
      setTimeout(() => this.summaryRef()?.nativeElement.focus());
      return;
    }

    this.error.set(null);
    this.view.set('submitting');
    this.api.requestLink(address).subscribe({
      next: () => {
        this.sentTo.set(address);
        this.view.set('success');
      },
      error: (failure: HttpErrorResponse) => {
        if (failure.status === 422) {
          this.view.set('form');
          this.error.set(MALFORMED);
          setTimeout(() => this.summaryRef()?.nativeElement.focus());
        } else if (failure.status === 429) {
          this.view.set('form');
          const seconds = Number(failure.headers.get('Retry-After')) || 3600;
          const minutes = Math.max(1, Math.ceil(seconds / 60));
          this.notice.set(
            `You\u2019re doing that a lot. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
          );
        } else {
          this.view.set('error');
        }
      },
    });
  }

  protected focusEmail(): void {
    document.getElementById('email')?.focus();
  }

  protected retry(): void {
    this.view.set('form');
  }
}
