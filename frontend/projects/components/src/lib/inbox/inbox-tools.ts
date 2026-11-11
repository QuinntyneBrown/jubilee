import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The strip above the list of conversations that holds its search: `<div jb-inbox-tools>`. */
@Component({
  selector: 'div[jb-inbox-tools]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inbox__tools' },
  templateUrl: './inbox-tools.html',
  styleUrl: './inbox-tools.scss',
})
export class InboxTools {}
