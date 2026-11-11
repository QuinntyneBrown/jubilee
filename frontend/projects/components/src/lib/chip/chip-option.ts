import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * One choice of a few, drawn as a chip around a native radio:
 *
 *     <jb-chip-option name="size" [value]="size" [checked]="chosen() === size"
 *       (selected)="chosen.set(size)">{{ size }}</jb-chip-option>
 *
 * The options of one choice share a `name`, so the arrow keys move between them.
 */
@Component({
  selector: 'jb-chip-option',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chip-option.html',
  styleUrl: './chip-option.scss',
})
export class ChipOption {
  readonly name = input.required<string>();
  readonly value = input.required<string>();
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The option was chosen. */
  readonly selected = output<void>();

  private readonly radio = viewChild.required<ElementRef<HTMLInputElement>>('radio');

  /** Moves focus to the radio. */
  focus(): void {
    this.radio().nativeElement.focus();
  }
}
