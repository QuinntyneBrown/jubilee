import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from 'components';
import { ToastService } from '../services/toast.service';

/** The live region that holds the toasts, above the tab bar on a phone. */
@Component({
  selector: 'jb-toast-region',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'toast-region', role: 'status', 'aria-live': 'polite' },
  templateUrl: './toast-region.html',
})
export class ToastRegion {
  protected readonly service = inject(ToastService);
}
