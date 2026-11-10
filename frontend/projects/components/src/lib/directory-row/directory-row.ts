import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** What a directory row shows (L2-027): the compact one-line entry of a category group. */
export interface DirectoryRowView {
  name: string;
  tagline: string;
  verified: boolean;
}

/**
 * The directory row: `<a jb-directory-row [business]="b" [routerLink]="…"></a>`. The kit cuts a
 * long name to one line with an ellipsis; the whole name stays in the DOM, so assistive
 * technology reads it in full.
 */
@Component({
  selector: 'a[jb-directory-row]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dir-row' },
  template: `
    <span class="dir-row__body">
      <span class="dir-row__name">
        <span class="truncate">{{ business().name }}</span>
        @if (business().verified) {
          <svg jb-icon name="verified"></svg><span class="visually-hidden">Verified</span>
        }
      </span>
      <span class="dir-row__tagline truncate" style="display: block">{{ business().tagline }}</span>
    </span>
    <svg jb-icon name="chevron-right"></svg>
  `,
})
export class DirectoryRow {
  readonly business = input.required<DirectoryRowView>();
}
