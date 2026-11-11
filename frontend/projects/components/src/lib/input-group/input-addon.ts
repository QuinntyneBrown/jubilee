import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The fixed text before or after the control of a `jb-input-group`: a unit, a currency. */
@Component({
  selector: 'span[jb-input-addon]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'addon' },
  templateUrl: './input-addon.html',
  styleUrl: './input-addon.scss',
})
export class InputAddon {}
