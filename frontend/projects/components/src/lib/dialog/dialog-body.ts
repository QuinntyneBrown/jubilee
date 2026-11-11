import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The body of a `jb-dialog`, on the `div` or the `form` that holds its content. */
@Component({
  selector: 'div[jb-dialog-body], form[jb-dialog-body]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog__body' },
  templateUrl: './dialog-body.html',
  styleUrl: './dialog-body.scss',
})
export class DialogBody {}
