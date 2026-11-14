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

export interface SizeChoice {
  readonly value: string;
  readonly label: string;
  /** The ages a youth size is for ("14–16"). */
  readonly ages?: string | null;
  readonly soldOut: boolean;
}

export interface SizeGuideRow {
  readonly label: string;
  readonly ages?: string | null;
  readonly chest: number;
  readonly length: number;
}

let nextId = 0;

/**
 * The size of a piece of merchandise (L2-264): the sizes as chips around native radios, a sold-out
 * size disabled, struck through and named "sold out"; the nudge beside the legend; the status line;
 * and the size guide behind its toggle.
 *
 *     <fieldset jb-size-picker [sizes]="sizes()" [value]="size()" [status]="status()"
 *       [guide]="guide()" [guideCaption]="caption()" [guideOpen]="open()"
 *       (valueChange)="size.set($event)" (guideToggle)="open.set(!open())"></fieldset>
 */
@Component({
  selector: 'fieldset[jb-size-picker]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'size-picker', '[attr.aria-describedby]': 'statusId()' },
  templateUrl: './size-picker.html',
  styleUrl: './size-picker.scss',
})
export class SizePicker {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly legend = input('Size');
  readonly sizes = input.required<readonly SizeChoice[]>();
  readonly value = input<string | null>(null);
  readonly status = input<string | null>(null);
  /** "Pick a size to continue" beside the legend. */
  readonly nudge = input(false, { transform: booleanAttribute });
  readonly guide = input<readonly SizeGuideRow[]>([]);
  readonly guideCaption = input<string | null>(null);
  readonly guideOpen = input(false, { transform: booleanAttribute });
  readonly name = input(`jb-size-${nextId++}`);
  readonly valueChange = output<string>();
  readonly guideToggle = output<void>();

  protected readonly statusId = computed(() => `${this.name()}-status`);
  protected readonly guideId = computed(() => `${this.name()}-guide`);

  /** A sold-out size says so in its name, not by its strike alone (L2-264 AC3). */
  protected soldOutName(size: SizeChoice): string {
    return `${size.label}, sold out${size.ages ? ` ${size.ages}` : ''}`;
  }

  /** Moves focus to the first size that can be chosen (L2-265 AC2). */
  focusFirst(): void {
    this.host.nativeElement.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
  }
}
