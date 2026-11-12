import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PROFILE_API, UnsubscribeCategory } from 'api';
import { AuthLayout, Button, EmptyState, Icon } from 'components';

type View = 'loading' | 'done' | 'invalid' | 'error';

/** What stops, in the words of the switches (L2-016 AC1). */
const STOPS: Record<UnsubscribeCategory, string> = {
  messages: 'We won’t e-mail you about new messages any more. They still reach you in Jubilee.',
  requests: 'We won’t e-mail you about request updates any more. They still reach you in Jubilee.',
  reminders: 'We won’t e-mail you meeting reminders any more. They still reach you in Jubilee.',
  'new-businesses': 'We won’t send you the weekly note about new businesses any more.',
  tips: 'We won’t send you tips for business owners any more.',
  summary:
    'We won’t send you the daily summary any more: “New messages” and “Request updates” are now off. They still reach you in Jubilee.',
};

/**
 * UnsubscribePage at /unsubscribe/:token (L2-224): opens the link in the footer of a notification
 * e-mail. The signed token is the credential, so nobody signs in. The page posts it, which turns the
 * e-mail's category off, and says what stops. The token leaves the address bar as soon as it is read.
 */
@Component({
  selector: 'jb-unsubscribe-page',
  imports: [RouterLink, AuthLayout, EmptyState, Icon, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './unsubscribe.page.html',
})
export class UnsubscribePage implements OnInit {
  private readonly api = inject(PROFILE_API);
  private readonly document = inject(DOCUMENT);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token');

  protected readonly view = signal<View>('loading');
  private readonly category = signal<UnsubscribeCategory | null>(null);
  protected readonly stops = computed(() => {
    const category = this.category();
    return (category && STOPS[category]) || 'We won’t send you e-mails like that one any more.';
  });

  ngOnInit(): void {
    this.document.defaultView?.history.replaceState(null, '', '/unsubscribe');
    this.unsubscribe();
  }

  protected unsubscribe(): void {
    if (!this.token) {
      this.view.set('invalid');
      return;
    }
    this.view.set('loading');
    this.api.unsubscribe(this.token).subscribe({
      next: (category) => {
        this.category.set(category);
        this.view.set('done');
      },
      error: (error: unknown) =>
        this.view.set(
          error instanceof HttpErrorResponse && error.status === 404 ? 'invalid' : 'error',
        ),
    });
  }
}
