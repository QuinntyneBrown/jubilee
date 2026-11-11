import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  Icon,
  MarketingHeading,
  MarketingLink,
  MarketingSection,
  PhotoBusinessCard,
  PhotoCardGrid,
  PhotoCardGridItem,
} from 'components';
import { APP_URL } from '../app-url';
import { BUSINESS_COUNT, INSIDE_CARDS } from '../content';

/** "Shops and services, side by side.": five business cards (L2-183 AC5). */
@Component({
  selector: 'jb-inside-the-app',
  imports: [
    MarketingHeading,
    MarketingSection,
    Icon,
    MarketingLink,
    PhotoBusinessCard,
    PhotoCardGrid,
    PhotoCardGridItem,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inside-the-app.html',
})
export class InsideTheApp {
  protected readonly browseUrl = `${inject(APP_URL)}/`;
  protected readonly count = BUSINESS_COUNT;
  protected readonly cards = INSIDE_CARDS;
}
