import { ChangeDetectionStrategy, Component } from '@angular/core';

/** What a business offers that sets it apart ("Free first meeting"), or a state worth the same emphasis. */
@Component({
  selector: 'span[jb-perk], p[jb-perk]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'perk' },
  templateUrl: './perk.html',
  styleUrl: './perk.scss',
})
export class Perk {}
