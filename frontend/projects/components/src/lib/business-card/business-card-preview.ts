import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName } from '../icon/icons';
import { TileTint } from '../media-tile/category-tile';
import { MediaTile } from '../media-tile/media-tile';
import { Perk } from '../perk/perk';
import { VerifiedMark } from '../verified-mark/verified-mark';

/**
 * How members will see a listing that is not live yet: the business card, with nothing to
 * follow. Until the listing is `verified` it says "Pending verification". The `highlight`, when
 * the owner wrote one, is the green line of the card, before the mark (L2-076 AC1).
 *
 *     <div jb-business-card-preview name="Luzandre.com" tagline="…" tint="gold" icon="bag"
 *          tag="Shop" highlight="Ships across Canada"></div>
 */
@Component({
  selector: 'div[jb-business-card-preview]',
  imports: [MediaTile, Perk, VerifiedMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'biz-card' },
  templateUrl: './business-card-preview.html',
  styleUrl: './business-card-preview.scss',
})
export class BusinessCardPreview {
  readonly name = input.required<string>();
  readonly tagline = input.required<string>();
  readonly tint = input.required<TileTint>();
  readonly icon = input.required<IconName>();
  readonly tag = input('');
  readonly highlight = input<string | null>(null);
  readonly verified = input(false, { transform: booleanAttribute });
}
