import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ACCOUNT_API } from 'api';
import { AuthLayout, EmptyState, Icon, Button, Spinner } from 'components';
import { ReturnAfterJoinService } from '../../services/return-after-join.service';
import { SessionService } from '../../services/session.service';

type View =
  | { kind: 'loading' }
  | { kind: 'pending' }
  | { kind: 'confirmed'; firstName: string | null }
  | { kind: 'expired' }
  | { kind: 'error' };

/**
 * VerifyEmailPage (L2-004): opens a confirmation link, or waits for it. The token is taken out of
 * the address bar as soon as it is read so it does not stay in history or leak through a referrer.
 */
@Component({
  selector: 'jb-verify-email-page',
  imports: [RouterLink, AuthLayout, EmptyState, Icon, Button, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verify-email.page.html',
})
export class VerifyEmailPage implements OnInit {
  private readonly api = inject(ACCOUNT_API);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token');

  protected readonly view = signal<View>({ kind: 'pending' });
  protected readonly member = this.session.member;
  protected readonly thanks = computed(() => {
    const view = this.view();
    return view.kind === 'confirmed' && view.firstName ? `Thanks, ${view.firstName}.` : 'Thanks.';
  });
  protected readonly sent = signal(false);
  private readonly returnAfterJoin = inject(ReturnAfterJoinService);
  /** Where the member was going when they were asked to join, if this browser remembers (L2-012 AC5). */
  protected readonly returnPath = signal<string | null>(this.returnAfterJoin.peek());
  protected readonly sendFailed = signal(false);

  ngOnInit(): void {
    if (this.token) {
      this.document.defaultView?.history.replaceState(null, '', '/verify-email');
      this.confirm(this.token);
    } else if (!this.session.unconfirmed()) {
      void this.router.navigate(['/']);
    }
  }

  /** The path is used once. */
  protected continued(): void {
    this.returnAfterJoin.forget();
  }

  protected confirm(token: string | null = this.token): void {
    if (!token) return;
    this.view.set({ kind: 'loading' });
    this.api.confirmEmail(token).subscribe({
      next: (response) => {
        if (response.outcome === 'expired') {
          this.view.set({ kind: 'expired' });
        } else {
          this.view.set({ kind: 'confirmed', firstName: response.firstName });
        }
        this.session.resolve().subscribe();
      },
      error: () => this.view.set({ kind: 'error' }),
    });
  }

  protected resend(): void {
    this.sendFailed.set(false);
    this.api.resendConfirmation().subscribe({
      next: () => {
        this.sent.set(true);
        this.view.set({ kind: 'pending' });
      },
      error: () => this.sendFailed.set(true),
    });
  }
}
