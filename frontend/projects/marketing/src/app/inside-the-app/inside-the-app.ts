import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MarketingHeading,
  MarketingSection,
  PhotoBusinessCard,
  PhotoCardGrid,
  PhotoCardGridItem,
} from 'components';
import { INSIDE_CARDS } from '../content';

/**
 * "Shops and services, side by side.": five business cards (L2-183 AC5). While Jubilee is
 * launching soon they are a preview: no card is a link and no count is stated.
 */
@Component({
  selector: 'jb-inside-the-app',
  imports: [
    MarketingHeading,
    MarketingSection,
    PhotoBusinessCard,
    PhotoCardGrid,
    PhotoCardGridItem,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inside-the-app.html',
})
export class InsideTheApp {
  protected readonly cards = INSIDE_CARDS;
}
