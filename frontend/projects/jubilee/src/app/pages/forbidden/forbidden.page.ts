import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HELP_API } from 'api';
import { EmptyState, Button } from 'components';
import { NavigationTrail } from '../../services/navigation-trail';
import { newKey } from '../../services/message-time';
import { ToastService } from '../../toasts/toast.service';

/**
 * The forbidden page (L2-098 AC1): signed in, but not allowed to see this area. "Ask for access"
 * tells the team which page it was and who asked; it grants nothing (L2-114 AC2).
 */
@Component({
  selector: 'jb-forbidden-page',
  imports: [RouterLink, EmptyState, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './forbidden.page.html',
})
export class ForbiddenPage {
  private readonly api = inject(HELP_API);
  private readonly toasts = inject(ToastService);
  private readonly trail = inject(NavigationTrail);
  /** A retry of the same ask reuses the key, so the team gets one request (L2-132). */
  private readonly key = newKey();

  protected readonly state = signal<'idle' | 'sending' | 'sent'>('idle');

  protected ask(): void {
    if (this.state() !== 'idle') return;
    this.state.set('sending');
    this.api.askForAccess(this.trail.blocked, this.key).subscribe({
      next: () => {
        this.state.set('sent');
        this.toasts.show({
          tone: 'success',
          title: 'We’ve passed your request to the team.',
          text: 'Nothing changes until someone replies by e-mail.',
        });
      },
      error: () => {
        this.state.set('idle');
        this.toasts.show({
          tone: 'danger',
          title: 'We couldn’t send your request.',
          text: 'Nothing was sent. Try again.',
          action: { label: 'Try again', run: () => this.ask() },
        });
      },
    });
  }
}
