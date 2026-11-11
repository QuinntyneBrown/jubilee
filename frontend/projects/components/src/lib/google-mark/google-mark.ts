import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The "G" of Google, before the label of a button that signs in with Google:
 * `<svg jb-google-mark></svg>`.
 *
 * It is Google's mark and is drawn unaltered. Its four colours are Google's own, the only
 * colours of the library that are not tokens, and are attributes of the drawing (ADR 0038).
 */
@Component({
  selector: 'svg[jb-google-mark]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'google-mark', 'aria-hidden': 'true', viewBox: '0 0 48 48' },
  templateUrl: './google-mark.html',
  styleUrl: './google-mark.scss',
})
export class GoogleMark {}
