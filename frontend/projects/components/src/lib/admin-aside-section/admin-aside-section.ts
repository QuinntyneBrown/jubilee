import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * A section of the overview's aside (L2-275): its title, with a link to the whole table beside it
 * when there is one ("Audit log"), over its list.
 *
 *     <section jb-admin-aside-section heading="Recent changes" link="/audit-records" linkText="Audit log">
 *       <ol jb-change-list [changes]="lines"></ol>
 *     </section>
 */
@Component({
  selector: 'section[jb-admin-aside-section]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'admin-aside-section' },
  templateUrl: './admin-aside-section.html',
  styleUrl: './admin-aside-section.scss',
})
export class AdminAsideSection {
  readonly heading = input.required<string>();
  readonly link = input<string | null>(null);
  readonly linkText = input<string | null>(null);
}
