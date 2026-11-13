import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName } from '../icon/icons';
import { TileTint } from '../media-tile/category-tile';
import { MediaTile } from '../media-tile/media-tile';
import { Perk } from '../perk/perk';

/**
 * How members see a listing: the business card, with nothing to follow. Until the listing is
 * `published` it says "Not published yet" (L2-076 AC1); nobody verifies it (ADR 0057). The
 * `highlight`, when the owner wrote one, is the green line of the card.
 *
 *     <div jb-business-card-preview name="Luzandre.com" tagline="…" tint="gold" icon="bag"
 *          tag="Shop" highlight="Ships across Canada"></div>
 */
@Component({
  selector: 'div[jb-business-card-preview]',
  imports: [MediaTile, Perk],
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
  readonly published = input(false, { transform: booleanAttribute });
}
