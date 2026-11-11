import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ACCOUNT_API } from 'api';
import { BrandMark, Button, Alert, FormSummary } from 'components';
import { SessionService } from '../../services/session.service';

/** GoogleAgreementPage (L2-003): a new Google member accepts the statement of faith and terms. */
@Component({
  selector: 'jb-join-agreement-page',
  imports: [RouterLink, BrandMark, Button, Alert, FormSummary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'auth-layout' },
  templateUrl: './join-agreement.page.html',
})
export class JoinAgreementPage {
  private readonly api = inject(ACCOUNT_API);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');

  protected readonly agreed = signal(false);
  protected readonly invalid = signal(false);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected submit(): void {
    if (this.busy()) return;
    this.failed.set(false);
    if (!this.agreed()) {
      this.invalid.set(true);
      setTimeout(() => document.getElementById('summary')?.focus());
      return;
    }
    this.invalid.set(false);
    this.busy.set(true);
    this.api.acceptAgreement().subscribe({
      next: () =>
        this.session.resolve().subscribe(() => {
          const target =
            this.returnUrl?.startsWith('/') && !this.returnUrl.startsWith('//')
              ? this.returnUrl
              : '/';
          void this.router.navigateByUrl(target);
        }),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }
}
