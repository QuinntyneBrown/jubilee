import { CdkMenuTrigger } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Menu } from '../menu/menu';
import { MenuDivider } from '../menu/menu-divider';
import { MenuItem } from '../menu/menu-item';
import { MenuLabel } from '../menu/menu-label';

/** A download the Export menu offers: CSV of the matching rows or of every record, or JSON. */
export interface ExportChoice {
  format: 'csv' | 'json';
  /** Only the rows that match the search and the filter. */
  matching: boolean;
}

const COUNT = new Intl.NumberFormat('en-CA');

const BELOW_END: ConnectedPosition = {
  originX: 'end',
  originY: 'bottom',
  overlayX: 'end',
  overlayY: 'top',
};
const BELOW_START: ConnectedPosition = {
  originX: 'start',
  originY: 'bottom',
  overlayX: 'start',
  overlayY: 'top',
};
const ABOVE_END: ConnectedPosition = {
  originX: 'end',
  originY: 'top',
  overlayX: 'end',
  overlayY: 'bottom',
};
const ABOVE_START: ConnectedPosition = {
  originX: 'start',
  originY: 'top',
  overlayX: 'start',
  overlayY: 'bottom',
};
/** End on the button's end; the others where that would leave the page. */
const END_ALIGNED = [BELOW_END, BELOW_START, ABOVE_END, ABOVE_START];
/** From the button's start; the others where that would leave the page. */
const START_ALIGNED = [BELOW_START, BELOW_END, ABOVE_START, ABOVE_END];

/**
 * Export, beside a table's heading (L2-279 AC1): a menu "Download" with "CSV, matching rows" and
 * their count while a search or filter is on, "CSV, every {singular}" and "JSON, every field" with
 * the table's count, and apart "Email me this weekly", or "Stop the weekly email" while it is on.
 *
 *     <div jb-export-menu singular="member" [total]="2431" [matching]="null" [weekly]="false"
 *       (downloaded)="download($event)" (weeklyChanged)="weekly($event)"></div>
 */
@Component({
  selector: 'div[jb-export-menu]',
  imports: [CdkMenuTrigger, Button, Icon, Menu, MenuDivider, MenuItem, MenuLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'export-menu' },
  templateUrl: './export-menu.html',
  styleUrl: './export-menu.scss',
})
export class ExportMenu {
  /** One record of the table, in lower case: "member". */
  readonly singular = input.required<string>();
  readonly total = input.required<number>();
  /** How many rows match the search and the filter; null when neither is on. */
  readonly matching = input<number | null>(null);
  readonly weekly = input(false, { transform: booleanAttribute });

  readonly downloaded = output<ExportChoice>();
  /** True to turn the weekly e-mail on, false to stop it. */
  readonly weeklyChanged = output<boolean>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Where the menu opens, chosen as the button is pressed or focused (L2-279 AC1): under the
   * button, its end on the button's end, as the design draws it beside the title; where Export
   * starts its row, as on a phone or when the heading's actions wrap under the title, from the
   * button's start, so that it never covers the sidebar of tables.
   */
  protected readonly positions = signal<ConnectedPosition[]>(END_ALIGNED);

  /** Opens towards the side of the screen's main region with more room. */
  protected place(): void {
    const button = this.host.nativeElement.getBoundingClientRect();
    const region = (
      this.host.nativeElement.closest('main') ?? document.body
    ).getBoundingClientRect();
    const startsLeft = button.left + button.width / 2 < region.left + region.width / 2;
    this.positions.set(startsLeft ? START_ALIGNED : END_ALIGNED);
  }

  protected count(n: number): string {
    return COUNT.format(n);
  }
}
