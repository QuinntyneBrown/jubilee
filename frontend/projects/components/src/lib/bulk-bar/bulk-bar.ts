import { CdkMenuTrigger } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { Menu } from '../menu/menu';
import { MenuItem } from '../menu/menu-item';
import { StatusPill } from '../status-pill/status-pill';

/**
 * The bar that floats at the foot of the screen while rows of a table are selected (L2-280 AC3),
 * the region "Selected {label}": how many, "Set {statusLabel}" when the table's status can be set,
 * the actions projected into it, and "Clear selection".
 *
 *     <div jb-bulk-bar label="feedback" [count]="2" statusLabel="status"
 *       [statuses]="['new', 'read']" (statusChosen)="set($event)" (cleared)="clear()"></div>
 *
 * "Set {statusLabel}" opens upward, each status as its pill (L2-280 AC4).
 */
@Component({
  selector: 'div[jb-bulk-bar]',
  imports: [CdkMenuTrigger, Icon, Menu, MenuItem, StatusPill],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bulk-bar', role: 'region', '[attr.aria-label]': '"Selected " + label()' },
  templateUrl: './bulk-bar.html',
  styleUrl: './bulk-bar.scss',
})
export class BulkBar {
  /** The table's name in lower case: "members". */
  readonly label = input.required<string>();
  readonly count = input.required<number>();
  /** The status field's name in lower case, or null when the status is not set here. */
  readonly statusLabel = input<string | null>(null);
  readonly statuses = input<readonly string[]>([]);

  readonly statusChosen = output<string>();
  readonly cleared = output<void>();

  protected readonly upward: ConnectedPosition[] = [
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
  ];
}
