import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A control joined to what stands before or after it: an addon, or a button.
 *
 *     <jb-input-group>
 *       <input jb-input type="text" [value]="url" readonly />
 *       <button slot="suffix" jb-button variant="primary" type="button">Copy</button>
 *     </jb-input-group>
 *
 * `slot="prefix"` and `slot="suffix"` take a `jb-input-addon` or a `jb-button`; the group
 * squares the corners where they meet.
 */
@Component({
  selector: 'jb-input-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'input-group' },
  templateUrl: './input-group.html',
  styleUrl: './input-group.scss',
})
export class InputGroup {}
