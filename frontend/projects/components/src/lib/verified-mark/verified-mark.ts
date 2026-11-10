import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * The verified mark (L2-111): the check icon and the word "Verified", so the status never
 * rests on colour alone. Render it only for a listing whose `verified` flag is true.
 */
@Component({
  selector: 'span[jb-verified-mark]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'verified' },
  templateUrl: './verified-mark.html',
})
export class VerifiedMark {}
