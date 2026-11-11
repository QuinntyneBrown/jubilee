import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppGlimpse, FloatingNote, MarketingButton, MarketingLink, Lockup } from 'components';
import { APP_URL } from './app-url';
import { Benefits } from './benefits/benefits';
import { ForBusinesses } from './for-businesses/for-businesses';
import { GLIMPSE } from './content';
import { HowItWorks } from './how-it-works/how-it-works';
import { InsideTheApp } from './inside-the-app/inside-the-app';
import { PitchVideo } from './pitch-video/pitch-video';

/** The marketing site's one page (L2-183), section for section as the design reference has it. */
@Component({
  selector: 'jb-root',
  imports: [
    MarketingButton,
    MarketingLink,
    Lockup,
    AppGlimpse,
    FloatingNote,
    PitchVideo,
    Benefits,
    HowItWorks,
    InsideTheApp,
    ForBusinesses,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  /** The app's browse home (L2-185 AC1). */
  protected readonly browseUrl = inject(APP_URL) + '/';
  protected readonly glimpse = GLIMPSE;
}
