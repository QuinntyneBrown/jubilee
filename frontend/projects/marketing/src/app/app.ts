import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AppGlimpse,
  FloatingNote,
  Icon,
  LaunchBadge,
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
import { Benefits } from './benefits/benefits';
import { BusinessPreRegistration } from './business-pre-registration/business-pre-registration';
import { ForBusinesses } from './for-businesses/for-businesses';
import { FILM, GLIMPSE, MISSION } from './content';
import { HowItWorks } from './how-it-works/how-it-works';
import { InsideTheApp } from './inside-the-app/inside-the-app';
import { LaunchNotification } from './launch-notification/launch-notification';

/**
 * The marketing site's one page (L2-183) in its launching-soon state (L2-215): it says Jubilee is
 * not open yet, holds the two forms and links nowhere outside itself.
 */
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
    LaunchBadge,
    BusinessPreRegistration,
    LaunchNotification,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
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
