import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CloseButton } from '../button/close-button';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

const ICON: Record<ToastTone, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  danger: 'alert',
};

/**
 * One toast: what happened, at most one action, and "Dismiss".
 *
 *     <div jb-toast tone="success" heading="Conversation muted" text="You won’t be e-mailed."
 *          actionLabel="Undo" [duration]="6000" [paused]="paused"
 *          (action)="undo()" (dismiss)="close()" (hold)="pause()" (release)="resume()"></div>
 *
 * A `duration` above zero draws the bar that counts it down; `paused` holds the bar. The toast
 * says `hold` while the pointer or the focus is in it and `release` when they leave: the timer
 * is its owner's. A danger toast is an alert. The tone is said by the icon as well as
 * its colour.
 */
@Component({
  selector: 'div[jb-toast]',
  imports: [Icon, CloseButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'toast',
    '[class.toast--success]': 'tone() === "success"',
    '[class.toast--warning]': 'tone() === "warning"',
    '[class.toast--danger]': 'tone() === "danger"',
    '[class.toast--info]': 'tone() === "info"',
    '[class.toast--paused]': 'paused()',
    '[attr.role]': 'tone() === "danger" ? "alert" : null',
    '[style.--jb-toast-duration.ms]': 'duration()',
    '(mouseenter)': 'hold.emit()',
    '(mouseleave)': 'release.emit()',
    '(focusin)': 'hold.emit()',
    '(focusout)': 'release.emit()',
  },
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class Toast {
  readonly tone = input<ToastTone>('info');
  readonly heading = input.required<string>();
  readonly text = input<string | null | undefined>(null);
  readonly actionLabel = input<string | null | undefined>(null);
  /** How long the toast stays, in milliseconds; zero for one that stays until dismissed. */
  readonly duration = input(0);
  readonly paused = input(false, { transform: booleanAttribute });

  readonly action = output<void>();
  readonly dismiss = output<void>();
  /** The pointer or the focus came into the toast: its timer should hold. */
  readonly hold = output<void>();
  /** They left: the timer may run again. */
  readonly release = output<void>();

  protected readonly icon = computed(() => ICON[this.tone()]);
}
