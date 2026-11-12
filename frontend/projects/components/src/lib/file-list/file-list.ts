import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** One chosen file of `jb-file-list`. */
export interface FileListItem {
  id: string;
  name: string;
}

/**
 * Files chosen for a form: a button that opens the file picker, the chosen files by name, each
 * with "Remove", and a line for a file that was refused:
 *
 *     <div jb-file-list label="Add screenshots" listLabel="Screenshots added"
 *          accept="image/jpeg,image/png" multiple [files]="shots()" [error]="refused()"
 *          (added)="add($event)" (removed)="remove($event)"></div>
 *
 * The component only reports what was picked; its owner decides which files to keep. `full`
 * disables the button when no more can be added.
 */
@Component({
  selector: 'div[jb-file-list]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'file-list' },
  templateUrl: './file-list.html',
  styleUrl: './file-list.scss',
})
export class FileList {
  /** The words of the button. */
  readonly label = input.required<string>();
  /** The accessible name of the list of chosen files. */
  readonly listLabel = input.required<string>();
  readonly files = input<readonly FileListItem[]>([]);
  /** The types the picker offers, as the `accept` of a file input. */
  readonly accept = input<string | null>(null);
  readonly multiple = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** No more files can be added. */
  readonly full = input(false, { transform: booleanAttribute });
  readonly error = input<string | null | undefined>(null);
  readonly added = output<File[]>();
  /** The id of the file whose "Remove" was pressed. */
  readonly removed = output<string>();

  private readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker');
  private readonly add = viewChild.required<ElementRef<HTMLButtonElement>>('add');

  protected open(): void {
    this.picker().nativeElement.click();
  }

  protected picked(): void {
    const input = this.picker().nativeElement;
    const files = Array.from(input.files ?? []);
    // The same file can be picked again after it was removed.
    input.value = '';
    if (files.length > 0) this.added.emit(files);
  }

  protected remove(id: string): void {
    this.removed.emit(id);
    // The row goes, so focus goes to the button.
    this.add().nativeElement.focus();
  }
}
