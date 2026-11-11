import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BrandMark, EmptyState, Icon, Button, Card } from 'components';
import { returnTo } from '../../services/navigation-trail';

/**
 * MaintenancePage (L2-117): Jubilee is being updated. The time it is back comes from the answer that
 * brought the member here, shown in Eastern time. "Check again" returns to the page they left; if it
 * is still being updated they land here again.
 */
@Component({
  selector: 'jb-maintenance-page',
  imports: [BrandMark, EmptyState, Icon, RouterLink, Button, Card],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'auth-layout' },
  templateUrl: './maintenance.page.html',
})
export class MaintenancePage {
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  /** The back-by time, when it is one. */
  protected readonly backBy = ((value: string | null) =>
    value && !Number.isNaN(Date.parse(value)) ? value : null)(this.query.get('backBy'));
  private readonly from = returnTo(this.query.get('from'));

  /** "6:00 a.m. Eastern on Wednesday 11 November", or nothing when no time was given. */
  protected readonly backByText = backByText(this.backBy);

  protected checkAgain(): void {
    void this.router.navigateByUrl(this.from);
  }
}

const TORONTO = 'America/Toronto';

/** The back-by time as the page says it: Toronto time, the weekday and the date. */
function backByText(value: string | null): string | null {
  if (!value) return null;
  const at = new Date(value);
  const time = new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TORONTO,
  }).format(at);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: TORONTO,
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return `${time.replace(/\s/g, ' ')} Eastern on ${parts['weekday']} ${parts['day']} ${parts['month']}`;
}
