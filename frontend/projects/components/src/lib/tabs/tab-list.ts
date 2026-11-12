import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { Badge } from '../badge/badge';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** One tab of `jb-tab-list`: a view of the page it is on. */
export interface TabListItem<K extends string = string> {
  key: K;
  label: string;
  /** A count beside the label; 0 is shown. */
  count?: number | null;
  /** An icon before the label. */
  icon?: IconName;
}

/**
 * The views of one page, as a tab list:
 *
 *     <div jb-tab-list label="Request type" [items]="tabs" [selected]="tab()"
 *          (selectedChange)="load($event)"></div>
 *
 * Only the selected tab is in the tab order; the left and right arrow keys select the tab
 * beside it and move focus there, wrapping at the ends (L2-158). With `panelPrefix` each tab
 * gets the id `tab-<key>` and controls the panel `<panelPrefix><key>`.
 *
 * `look="segmented"` draws a pill track whose selected tab is a raised pill; with `size="lg"` the
 * track is as wide as its tabs from 640 px. `disabled` holds the choice while work is under way:
 * the tabs that are not selected cannot be chosen.
 */
@Component({
  selector: 'div[jb-tab-list]',
  imports: [Badge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tabs',
    role: 'tablist',
    '[class.tabs--segmented]': 'look() === "segmented"',
    '[class.tabs--lg]': 'size() === "lg"',
    '[attr.aria-label]': 'label()',
  },
  templateUrl: './tab-list.html',
  styleUrl: './tab-list.scss',
})
export class TabList<K extends string = string> {
  /** The accessible name of the tab list. */
  readonly label = input.required<string>();
  readonly items = input.required<readonly TabListItem<K>[]>();
  readonly selected = input.required<K | null>();
  /** The prefix of the id of the panel each tab controls, when the page has one per tab. */
  readonly panelPrefix = input<string | null>(null);
  readonly look = input<'underline' | 'segmented'>('underline');
  readonly size = input<'md' | 'lg'>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly selectedChange = output<K>();

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  protected move(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step || this.disabled()) return;
    event.preventDefault();
    const items = this.items();
    const next = (index + step + items.length) % items.length;
    this.selectedChange.emit(items[next].key);
    this.buttons()[next]?.nativeElement.focus();
  }
}
