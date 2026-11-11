import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { APP_URL } from './app-url';
import { Benefits } from './benefits/benefits';
import { ForBusinesses } from './for-businesses/for-businesses';
import { HeroVisual } from './hero-visual/hero-visual';
import { HowItWorks } from './how-it-works/how-it-works';
import { InsideTheApp } from './inside-the-app/inside-the-app';
import { Lockup } from './lockup/lockup';
import { PitchVideo } from './pitch-video/pitch-video';

/** The marketing site's one page (L2-183), section for section as the design reference has it. */
@Component({
  selector: 'jb-root',
  imports: [Lockup, HeroVisual, PitchVideo, Benefits, HowItWorks, InsideTheApp, ForBusinesses],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  /** The app's browse home (L2-185 AC1). */
  protected readonly browseUrl = inject(APP_URL) + '/';
}
