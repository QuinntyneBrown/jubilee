import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** One business in the glimpse's results. */
export interface AppGlimpseResult {
  name: string;
  tagline: string;
  /** The address of the photo. It is decorative: the name beside it says who it is. */
  photo: string;
}

/**
 * A glimpse of the app for the marketing site: a search, what it found and, projected over its
 * corners, `jb-floating-note`s.
 *
 *     <div jb-app-glimpse label="A glimpse of the app" search="Home repairs near Leslieville"
 *          caption="Home & property · a preview" [results]="results">
 *       <p jb-floating-note tone="trust" icon="check-circle">Every owner agrees to our statement of faith</p>
 *     </div>
 *
 * It is a picture of the app, not a part of it: nothing in it can be used. It reads the
 * marketing page's grounds, --jb-mkt-paper and --jb-mkt-accent.
 */
@Component({
  selector: 'div[jb-app-glimpse]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-glimpse', role: 'group', '[attr.aria-label]': 'label()' },
  templateUrl: './app-glimpse.html',
  styleUrl: './app-glimpse.scss',
})
export class AppGlimpse {
  /** The name of the group, for assistive technology. */
  readonly label = input.required<string>();
  readonly search = input.required<string>();
  readonly caption = input.required<string>();
  readonly results = input.required<readonly AppGlimpseResult[]>();
}
