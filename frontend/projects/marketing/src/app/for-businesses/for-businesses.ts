import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  Icon,
  MarketingButton,
  MarketingHeading,
  MarketingSection,
  Point,
  PointList,
} from 'components';

/**
 * "Run a Christian-owned business? Be found.": the section for owners (L2-183 AC6). Its action
 * moves to the business pre-registration form (L2-215 AC3).
 */
@Component({
  selector: 'jb-for-businesses',
  imports: [MarketingHeading, MarketingSection, Point, PointList, Icon, MarketingButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './for-businesses.html',
})
export class ForBusinesses {}
