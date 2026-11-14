import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The heading of a screen of the admin application (L2-274, L2-276): the eyebrow, the title and the
 * lead.
 *
 *     <div jb-admin-heading eyebrow="Accounts" heading="Members">
 *       <span slot="title" jb-lock-tag></span>
 *       Everyone with a Jubilee account…
 *     </div>
 *
 * `greeting` is the overview's larger title. What follows the title in it (a lock tag) goes in the
 * `title` slot; the rest is the lead, left out when empty.
 */
@Component({
  selector: 'div[jb-admin-heading]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'admin-heading', '[class.admin-heading--greeting]': 'greeting()' },
  templateUrl: './admin-heading.html',
  styleUrl: './admin-heading.scss',
})
export class AdminHeading {
  readonly eyebrow = input<string | null>(null);
  readonly heading = input.required<string>();
  readonly greeting = input(false, { transform: booleanAttribute });
}
