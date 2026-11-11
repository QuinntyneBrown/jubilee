import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * The frame of a dialog: the panel, its header (icon, title, description, close button) and
 * whatever the dialog puts in it, usually a body and a footer:
 *
 *     <jb-dialog heading="Sign out of Jubilee?" icon="sign-out" [busy]="busy()" (closed)="close()">
 *       <div jb-dialog-body class="stack">…</div>
 *       <div jb-dialog-footer>
 *         <button jb-button type="button" (click)="close()">Stay signed in</button>
 *       </div>
 *     </jb-dialog>
 *
 * A description with markup is projected with `slot="description"`; a message that belongs
 * under it (an error) with `slot="status"`. The title and the description carry `titleId` and
 * `descriptionId`, which the opener names in `ariaLabelledBy` and `ariaDescribedBy`.
 *
 * The frame is a bottom sheet under 640 px and a centred panel from there; `anchored` hangs it
 * under the avatar at the right of the top bar instead (the account menu).
 */
@Component({
  selector: 'jb-dialog',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dialog',
    '[class.dialog--anchored]': 'anchored()',
    '(click)': 'clicked($event)',
  },
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
})
export class DialogFrame {
  readonly heading = input.required<string>();
  readonly description = input<string | null>(null);
  readonly icon = input<IconName | null>(null);
  readonly tone = input<'info' | 'danger' | 'success' | 'warning'>('info');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** Work is under way: the close button is disabled. */
  readonly busy = input(false, { transform: booleanAttribute });
  readonly anchored = input(false, { transform: booleanAttribute });
  readonly titleId = input('dlg-title');
  readonly descriptionId = input('dlg-desc');
  /** The close button was pressed. */
  readonly closed = output<void>();
  /** A click landed beside the panel. */
  readonly outsideClick = output<void>();

  protected clicked(event: Event): void {
    if (event.target === event.currentTarget) this.outsideClick.emit();
  }
}
