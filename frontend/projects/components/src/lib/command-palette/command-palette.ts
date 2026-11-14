import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** An option of the palette: a table, with its group, or a record, with "{singular} · {ID}". */
export interface PaletteItem {
  kind: 'table' | 'record';
  label: string;
  meta: string;
  /** Where choosing it goes. */
  link: string;
}

let nextId = 0;

/**
 * The jump palette of the admin application (L2-273): the field "Jump to a table or record" as a
 * combobox with "esc", over the list of tables and records. ↑ and ↓ move the choice, marked
 * `aria-selected` with the Enter icon; Enter chooses it; a press outside the panel dismisses the
 * palette. With text and no options it says "Nothing matches “{text}”." It never calls the API: it
 * emits the text and the chosen option.
 *
 *     <div jb-command-palette [text]="text()" [items]="items()" (textChange)="search($event)"
 *       (choose)="go($event)" (dismiss)="close()"></div>
 */
@Component({
  selector: 'div[jb-command-palette]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'palette', '(click)': 'pressed($event)' },
  templateUrl: './command-palette.html',
  styleUrl: './command-palette.scss',
})
export class CommandPalette {
  readonly text = input('');
  readonly items = input<readonly PaletteItem[]>([]);
  readonly placeholder = input('Members, ruth.c@outlook.com, lst_flower…');
  /** The records for the text are still being found: "Nothing matches" waits for them. */
  readonly pending = input(false, { transform: booleanAttribute });
  readonly textChange = output<string>();
  readonly choose = output<PaletteItem>();
  readonly dismiss = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly id = `palette-${++nextId}`;
  /** The chosen option; the first whenever the options change. */
  protected readonly active = linkedSignal<readonly PaletteItem[], number>({
    source: this.items,
    computation: () => 0,
  });
  protected readonly activeId = computed(() =>
    this.items().length ? `${this.id}-${this.active()}` : null,
  );

  constructor() {
    // Keep the chosen option in view as the arrow keys move it.
    afterRenderEffect(() => {
      const id = this.activeId();
      if (id) this.host.nativeElement.querySelector(`#${id}`)?.scrollIntoView({ block: 'nearest' });
    });
  }

  protected keydown(event: KeyboardEvent): void {
    const count = this.items().length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!count) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.active.update((i) => (i + step + count) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.items()[this.active()];
      if (item) this.choose.emit(item);
    }
  }

  protected picked(event: MouseEvent, item: PaletteItem): void {
    // A plain click chooses in place; a modified one opens the link as the browser would.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    this.choose.emit(item);
  }

  protected pressed(event: MouseEvent): void {
    if (event.target === this.host.nativeElement) this.dismiss.emit();
  }
}
