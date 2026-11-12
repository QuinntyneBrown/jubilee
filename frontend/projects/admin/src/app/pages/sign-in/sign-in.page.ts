import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Alert, AlertTone, AuthLayout, Button, Icon } from 'components';
import { map } from 'rxjs';
import { SignInState } from '../../app.routes';
import { screenOrQueue } from '../../services/return-url';
import { StaffSessionService } from '../../services/staff-session.service';

interface Message {
  tone: AlertTone;
  role: 'alert' | 'status';
  heading: string;
  text: string;
  reference?: string;
  after?: string;
}

/** What each refused sign-in says (L2-189 AC3–5); `cancelled` says nothing (AC6). */
const REFUSALS: Record<string, Message> = {
  'second-factor': {
    tone: 'danger',
    role: 'alert',
    heading: 'Sign-in needs a second factor.',
    text: 'Your staff account signed in without one, so we didn’t let you in. Set up a second factor for your staff account, then try again.',
  },
  'not-staff': {
    tone: 'danger',
    role: 'alert',
    heading: 'This account isn’t on the Jubilee staff list.',
    text: 'Ask a Jubilee administrator to add you. Members sign in at app.jubilee.to.',
  },
  sso: {
    tone: 'danger',
    role: 'alert',
    heading: 'We couldn’t sign you in.',
    text: 'The sign-in service didn’t answer as expected. Try again. If it keeps happening, tell us and quote ',
    reference: 'JB-STAFF-503',
    after: '.',
  },
};

const NETWORK: Message = {
  tone: 'warning',
  role: 'alert',
  heading: 'You’re not on an allowed network.',
  text: 'The admin application only answers on a Jubilee staff network. Connect to one and try again.',
};

const STATES: Record<Exclude<SignInState, 'sign-in'>, Message> = {
  'signed-out': {
    tone: 'success',
    role: 'status',
    heading: 'You’ve signed out of the admin application.',
    text: 'Sign in again whenever you’re ready.',
  },
  'session-expired': {
    tone: 'info',
    role: 'status',
    heading: 'Your staff session ended.',
    text: 'For your safety staff sessions end after 30 minutes without activity, and 8 hours after sign-in.',
  },
};

/**
 * `/sign-in`, `/signed-out` and `/session-expired` of the admin application (L2-189, L2-190): one
 * button that hands over to single sign-on, the reason a sign-in was refused, and the refusal of a
 * network that is not allowed (L2-192 AC6), which offers no sign-in.
 */
@Component({
  selector: 'jb-sign-in-page',
  imports: [Alert, AuthLayout, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page' },
  templateUrl: './sign-in.page.html',
})
export class SignInPage {
  private readonly document = inject(DOCUMENT);
  private readonly session = inject(StaffSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly state = toSignal(
    this.route.data.pipe(map((data) => (data['state'] as SignInState) ?? 'sign-in')),
    { initialValue: (this.route.snapshot.data['state'] as SignInState) ?? 'sign-in' },
  );

  protected readonly refused = this.session.refused;
  protected readonly busy = signal(false);

  protected readonly heading = computed(() =>
    this.state() === 'signed-out'
      ? 'Signed out'
      : this.state() === 'session-expired'
        ? 'Session ended'
        : 'Sign in to the admin application',
  );

  protected readonly message = computed<Message | null>(() => {
    if (this.refused()) return NETWORK;
    const state = this.state();
    if (state !== 'sign-in') return STATES[state];
    return REFUSALS[this.query().get('error') ?? ''] ?? null;
  });

  protected readonly label = computed(() =>
    this.busy()
      ? 'Signing in…'
      : this.state() !== 'sign-in'
        ? 'Sign in again'
        : this.query().get('error') === 'sso'
          ? 'Try again'
          : 'Sign in with your staff account',
  );

  /** Hands over to single sign-on, which returns to the screen asked for (L2-189 AC2, AC7). */
  protected signIn(): void {
    if (this.busy()) return;
    this.busy.set(true);
    const returnUrl = screenOrQueue(this.query().get('returnUrl'));
    this.document.location.assign(this.session.signInUrl(returnUrl));
  }
}
