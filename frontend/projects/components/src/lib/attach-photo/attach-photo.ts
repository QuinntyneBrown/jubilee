import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * The photo control of a composer: "Attach a photo" opens the device's picker, and the chosen
 * photo then shows as a small preview with "Remove photo" until it is sent.
 *
 *     <jb-attach-photo [preview]="photoUrl()" (picked)="attach($event)" (removed)="detach()" />
 *
 * It hands over the file as it was picked; checking and shrinking it is the caller's work.
 */
@Component({
  selector: 'jb-attach-photo',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'attach' },
  templateUrl: './attach-photo.html',
  styleUrl: './attach-photo.scss',
})
export class AttachPhoto {
  /** The address of the chosen photo, to show it; null while none is chosen. */
  readonly preview = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly picked = output<File>();
  readonly removed = output<void>();

  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('file');
  private readonly button = viewChild('trigger', { read: ElementRef<HTMLElement> });

  protected open(): void {
    this.input().nativeElement.click();
  }

  protected choose(): void {
    const element = this.input().nativeElement;
    const file = element.files?.[0];
    // The same file can be picked again after it is removed.
    element.value = '';
    if (file) this.picked.emit(file);
  }

  protected remove(): void {
    this.removed.emit();
    // The preview goes; focus returns to the button that takes its place.
    setTimeout(() => this.button()?.nativeElement.focus());
  }
}
