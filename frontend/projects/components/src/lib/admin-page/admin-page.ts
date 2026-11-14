import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The column of a screen of the admin application, inside the shell's `main`:
 * `<div jb-admin-page width="wide">…</div>`. `wide` is a table's (L2-276), `record` a record's
 * (L2-282); the overview uses the default.
 */
@Component({
  selector: 'div[jb-admin-page]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'admin-page',
    '[class.admin-page--wide]': 'width() === "wide"',
    '[class.admin-page--record]': 'width() === "record"',
  },
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPage {
  readonly width = input<'default' | 'wide' | 'record'>('default');
}
