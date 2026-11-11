import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PROFILE_API } from 'api';
import { BrandMark, EmptyState, Icon } from 'components';
import { SessionService } from '../../services/session.service';

type View = 'loading' | 'confirmed' | 'expired' | 'in-use' | 'error';

/**
 * ConfirmEmailChangePage at /confirm-email-change/:token (L2-014 AC3): opens the link sent to the
 * new address. The token leaves the address bar as soon as it is read.
 */
@Component({
  selector: 'jb-confirm-email-change-page',
  imports: [RouterLink, BrandMark, EmptyState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'auth-layout' },
  templateUrl: './confirm-email-change.page.html',
})
export class ConfirmEmailChangePage implements OnInit {
  private readonly api = inject(PROFILE_API);
  private readonly session = inject(SessionService);
  private readonly document = inject(DOCUMENT);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token');

  protected readonly view = signal<View>('loading');

  ngOnInit(): void {
    this.document.defaultView?.history.replaceState(null, '', '/confirm-email-change');
    this.confirm();
  }

  protected confirm(): void {
    if (!this.token) {
      this.view.set('expired');
      return;
    }
    this.view.set('loading');
    this.api.confirmEmailChange(this.token).subscribe({
      next: (outcome) => {
        this.view.set(
          outcome === 'confirmed' ? 'confirmed' : outcome === 'email-in-use' ? 'in-use' : 'expired',
        );
        if (outcome === 'confirmed') this.session.resolve().subscribe();
      },
      error: () => this.view.set('error'),
    });
  }
}
