import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon, IconName } from 'components';
import { ToastService, ToastTone } from './toast.service';

const ICON: Record<ToastTone, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  danger: 'alert',
};

/** The live region the toasts rise in; it sits above the tab bar on a phone. */
@Component({
  selector: 'jb-toast-region',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'toast-region', role: 'status', 'aria-live': 'polite' },
  templateUrl: './toast-region.html',
})
export class ToastRegion {
  protected readonly toasts = inject(ToastService);

  protected icon(tone: ToastTone): IconName {
    return ICON[tone];
  }
}
