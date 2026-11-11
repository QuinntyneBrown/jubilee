import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GLIMPSE_RESULTS } from '../content';

/** A glimpse of the app beside the opening: a search with four verified businesses (L2-183 AC2). */
@Component({
  selector: 'jb-hero-visual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-visual.html',
})
export class HeroVisual {
  protected readonly results = GLIMPSE_RESULTS;
}
