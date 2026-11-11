import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The footer of a `jb-dialog`: its actions, the main one last. It stays in view as the body scrolls. */
@Component({
  selector: 'div[jb-dialog-footer]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog__footer' },
  templateUrl: './dialog-footer.html',
  styleUrl: './dialog-footer.scss',
})
export class DialogFooter {}
