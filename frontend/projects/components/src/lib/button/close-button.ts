import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * The quiet close button of an alert, a banner or a toast. It draws its own cross, so it needs
 * an accessible name:
 *
 *     <button jb-close-button type="button" aria-label="Dismiss" (click)="dismiss()"></button>
 *
 * It takes the colour of the block it closes. That block places it with `--jb-close-margin` and
 * sets the strength of its hover wash with `--jb-close-hover-mix`.
 */
@Component({
  selector: 'button[jb-close-button]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'close' },
  templateUrl: './close-button.html',
  styleUrl: './close-button.scss',
})
export class CloseButton {}
