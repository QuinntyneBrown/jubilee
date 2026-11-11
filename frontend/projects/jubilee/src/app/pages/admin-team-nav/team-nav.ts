import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The pages of the verification team, side by side under each page's title. */
@Component({
  selector: 'nav[jb-team-nav]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tabs', 'aria-label': 'Verification team' },
  templateUrl: './team-nav.html',
})
export class TeamNav {
  readonly current = input.required<'verifications' | 'reports' | 'featured'>();
}
