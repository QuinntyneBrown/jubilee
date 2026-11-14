import { CdkMenuTrigger } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Menu } from '../menu/menu';
import { MenuCheck } from '../menu/menu-check';
import { MenuDivider } from '../menu/menu-divider';
import { MenuItem } from '../menu/menu-item';
import { MenuLabel } from '../menu/menu-label';
import { SearchField } from '../search-field/search-field';

/** A field of the table as the Columns menu lists it. */
export interface RecordsColumnChoice {
  key: string;
  label: string;
  shown: boolean;
}

/**
 * The tools above a table of the admin application (L2-277 AC1, L2-278 AC1): the search across
 * every field, and at the end "Columns {n}", a menu "Show in table" of every field.
 *
 *     <div jb-records-tools unit="members" [value]="q()" [columns]="choices()"
 *       (typed)="search($event)" (toggled)="toggle($event)" (resetColumns)="resetColumns()"></div>
 *
 * The box is named "Search {unit}" and reads "Search {unit} by any field"; `typed` carries the
 * text at every change. A field of the menu is a checkbox, checked while its column is shown;
 * `toggled` carries its key. The last shown column cannot be hidden. "Reset to default" emits
 * `resetColumns`.
 */
@Component({
  selector: 'div[jb-records-tools]',
  imports: [
    CdkMenuTrigger,
    Button,
    Icon,
    Menu,
    MenuCheck,
    MenuDivider,
    MenuItem,
    MenuLabel,
    SearchField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'records-tools' },
  templateUrl: './records-tools.html',
  styleUrl: './records-tools.scss',
})
export class RecordsTools {
  /** What the table holds, in lower case: "members". */
  readonly unit = input.required<string>();
  readonly value = input('');
  readonly columns = input<readonly RecordsColumnChoice[]>([]);

  readonly typed = output<string>();
  readonly toggled = output<string>();
  readonly resetColumns = output<void>();

  /** The menu opens under the button, its end on the button's end, as the design draws it. */
  protected readonly endAligned: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
  ];

  protected readonly shown = computed(() => this.columns().filter((c) => c.shown).length);
}
