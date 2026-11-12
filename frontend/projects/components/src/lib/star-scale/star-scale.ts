import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { Icon } from '../icon/icon';

let nextId = 0;

/**
 * A rating of 1 to 5 as five stars, which are five native radios in one group:
 *
 *     <fieldset jb-star-scale legend="How’s Jubilee working for you so far?"
 *               [words]="words" [value]="rating()" (valueChange)="rating.set($event)"></fieldset>
 *
 * Each star is named "{n} of 5: {word}"; the word of the chosen star stands beside the stars and
 * `prompt` before any is chosen. `focus()` moves focus to the stars. The chosen star and those before it are filled. `error` says
 * what to fix under the stars and marks the group invalid.
 */
@Component({
  selector: 'fieldset[jb-star-scale]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'star-scale',
    role: 'radiogroup',
    '[class.star-scale--lg]': 'size() === "lg"',
    '[attr.aria-labelledby]': 'legendId()',
    '[attr.aria-describedby]': 'error() ? errorId() : null',
    '[attr.aria-invalid]': 'error() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
  },
  templateUrl: './star-scale.html',
  styleUrl: './star-scale.scss',
})
export class StarScale {
  readonly legend = input.required<string>();
  /** The word of each star, the first for 1. */
  readonly words = input.required<readonly string[]>();
  readonly value = input<number | null>(null);
  /** What stands beside the stars before one is chosen. */
  readonly prompt = input('Tap to rate');
  readonly size = input<'md' | 'lg'>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Marks the legend "(required)". */
  readonly required = input(false, { transform: booleanAttribute });
  readonly error = input<string | null | undefined>(null);
  readonly controlId = input(`jb-star-scale-${nextId++}`);
  readonly valueChange = output<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Moves focus to the chosen star, or to the first when none is. */
  focus(): void {
    (
      this.host.querySelector<HTMLInputElement>('input:checked') ??
      this.host.querySelector<HTMLInputElement>('input')
    )?.focus();
  }

  protected readonly legendId = computed(() => `${this.controlId()}-legend`);
  protected readonly errorId = computed(() => `${this.controlId()}-error`);
  protected readonly word = computed(() => {
    const value = this.value();
    return value ? (this.words()[value - 1] ?? '') : this.prompt();
  });
}
