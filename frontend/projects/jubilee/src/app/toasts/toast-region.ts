import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toast } from 'components';
import { ToastService } from './toast.service';

/** The live region the toasts rise in; it sits above the tab bar on a phone. */
@Component({
  selector: 'jb-toast-region',
  imports: [Toast],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'toast-region', role: 'status', 'aria-live': 'polite' },
  templateUrl: './toast-region.html',
})
export class ToastRegion {
  protected readonly toasts = inject(ToastService);
}
