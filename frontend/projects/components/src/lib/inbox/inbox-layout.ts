import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Messages in two columns: the list of conversations and the one that is open. Below the desktop
 * layout only the column named by `showing` is drawn.
 *
 *     <jb-inbox-layout showing="detail">
 *       <jb-inbox-list slot="list" />
 *       <div slot="detail" jb-chat>…</div>
 *     </jb-inbox-layout>
 */
@Component({
  selector: 'jb-inbox-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inbox',
    '[class.inbox--list]': 'showing() === "list"',
    '[class.inbox--chat]': 'showing() === "detail"',
  },
  templateUrl: './inbox-layout.html',
  styleUrl: './inbox-layout.scss',
})
export class InboxLayout {
  readonly showing = input.required<'list' | 'detail'>();
}
