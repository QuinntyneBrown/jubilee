import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A rounded band of brand ink that makes one offer: a heading, a line of text and the action
 * beside them.
 *
 *     <div jb-band heading="New here?" text="Join free to message businesses.">
 *       <a jb-button variant="primary" routerLink="/join">Join free</a>
 *     </div>
 *
 * With `headingId` the band is named by its heading (`aria-labelledby`).
 */
@Component({
  selector: 'section[jb-band], div[jb-band]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'band', '[attr.aria-labelledby]': 'headingId()' },
  templateUrl: './band.html',
  styleUrl: './band.scss',
})
export class Band {
  readonly heading = input.required<string>();
  readonly headingId = input<string | null>(null);
  readonly text = input.required<string>();
}
