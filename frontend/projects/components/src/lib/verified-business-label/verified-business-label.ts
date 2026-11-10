import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';

/** The Help answer that explains verification (L2-111 AC3). */
export const VERIFICATION_HELP = { path: '/help', fragment: 'how-does-a-business-get-verified' };

/**
 * The kicker of a listing page (L2-111 AC3): the verified icon, "Verified Christian business"
 * linking to the Help answer on verification, and the category:
 * `<p jb-verified-business-label [category]="{ slug, name }"></p>`.
 */
@Component({
  selector: 'p[jb-verified-business-label]',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'detail-head__kicker' },
  template: `<svg jb-icon name="verified"></svg
    ><a [routerLink]="help.path" [fragment]="help.fragment">Verified Christian business</a> ·
    <a [routerLink]="['/c', category().slug]">{{ category().name }}</a>`,
})
export class VerifiedBusinessLabel {
  readonly category = input.required<{ slug: string; name: string }>();
  protected readonly help = VERIFICATION_HELP;
}
