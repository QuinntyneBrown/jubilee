import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The panel of one conversation: `jb-chat-head`, then the `jb-message-thread`, then what the page
 * puts under it.
 */
@Component({
  selector: 'div[jb-chat]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'chat' },
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {}
