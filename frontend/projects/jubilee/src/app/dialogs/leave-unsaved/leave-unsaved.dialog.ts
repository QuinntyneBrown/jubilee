import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon, Button } from 'components';

/** LeaveUnsavedDialog (L2-013 AC6): the member typed changes and is about to leave without saving. */
@Component({
  selector: 'jb-leave-unsaved-dialog',
  imports: [Icon, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  templateUrl: './leave-unsaved.dialog.html',
})
export class LeaveUnsavedDialog {
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);

  /** True when the member chose to leave. */
  protected decide(leave: boolean): void {
    this.ref.close(leave);
  }
}
