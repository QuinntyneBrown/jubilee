import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AppGlimpse,
  FloatingNote,
  Icon,
  Lockup,
  MarketingButton,
  MarketingFooter,
  MarketingHeading,
  MarketingLink,
  MarketingNav,
  MarketingNavLink,
  MarketingSection,
  SkipLink,
  VideoPlayer,
} from 'components';
import { APP_URL } from './app-url';
import { Benefits } from './benefits/benefits';
import { ForBusinesses } from './for-businesses/for-businesses';
import { FILM, GLIMPSE, MISSION } from './content';
import { HowItWorks } from './how-it-works/how-it-works';
import { InsideTheApp } from './inside-the-app/inside-the-app';

/** The marketing site's one page (L2-183), section for section as the design reference has it. */
@Component({
  selector: 'jb-root',
  imports: [
    MarketingHeading,
    MarketingSection,
    Icon,
    MarketingFooter,
    MarketingNav,
    SkipLink,
    MarketingButton,
    MarketingLink,
    Lockup,
    AppGlimpse,
    FloatingNote,
    VideoPlayer,
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
  protected readonly sections: readonly MarketingNavLink[] = [
    { label: 'Why Jubilee', href: '#why' },
    { label: 'How it works', href: '#how' },
    { label: 'Inside the app', href: '#inside' },
    { label: 'For businesses', href: '#businesses' },
  ];
  protected readonly glimpse = GLIMPSE;
  protected readonly film = FILM;
  /** Jubilee's mission (L0-001), stated after the film (L2-183 AC8). */
  protected readonly mission = MISSION;
}
