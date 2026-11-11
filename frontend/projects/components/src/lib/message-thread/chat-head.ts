import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The head of a conversation: who it is with, between what leads (the way back, the avatar) and
 * the actions.
 *
 *     <div jb-chat-head heading="Legacy Financial" subtitle="Trevor Chew · usually replies in a day">
 *       <a slot="leading" jb-button variant="ghost" iconOnly routerLink="/messages" aria-label="Back">…</a>
 *       <jb-avatar slot="leading" name="Legacy Financial" />
 *       <button jb-button variant="ghost" iconOnly type="button" aria-label="More">…</button>
 *     </div>
 *
 * The heading is the page's `h1`.
 */
@Component({
  selector: 'div[jb-chat-head]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'chat__head' },
  templateUrl: './chat-head.html',
  styleUrl: './chat-head.scss',
})
export class ChatHead {
  readonly heading = input.required<string>();
  readonly subtitle = input('');
}
