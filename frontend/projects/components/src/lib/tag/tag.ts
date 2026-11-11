import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A fact about a business that is not a state: a credential, a licence. */
@Component({
  selector: 'span[jb-tag]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tag' },
  templateUrl: './tag.html',
  styleUrl: './tag.scss',
})
export class Tag {}
