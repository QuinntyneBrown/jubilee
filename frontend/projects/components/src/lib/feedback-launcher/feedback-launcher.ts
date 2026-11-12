import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * The way into the feedback panel, fixed at the bottom right of every member screen (L2-210):
 *
 *     <jb-feedback-launcher (opened)="openFeedback($event)" />
 *
 * Under 768 px it is a round icon button above the phone tab bar; from there a pill with the
 * word "Feedback". Its name is "Give feedback" at every width. `opened` carries the button, for
 * a caller that returns focus to it.
 */
@Component({
  selector: 'jb-feedback-launcher',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feedback-launcher.html',
  styleUrl: './feedback-launcher.scss',
})
export class FeedbackLauncher {
  readonly opened = output<HTMLButtonElement>();
}
