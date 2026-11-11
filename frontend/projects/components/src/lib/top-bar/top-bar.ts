import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandMark } from '../brand-mark/brand-mark';
import { Icon } from '../icon/icon';
import { ChromeMember, ChromeSection } from '../navigation';
import { UnreadBadge } from '../unread-badge/unread-badge';
import { Button } from '../button/button';
import { Input } from '../input/input';

/**
 * The ink top bar. Which parts show at which width is decided by the kit's media queries
 * (L2-164): the primary navigation and the avatar from 768 px, the search box from 1024 px.
 */
@Component({
  selector: 'header[jb-top-bar]',
  imports: [RouterLink, BrandMark, Icon, UnreadBadge, Button, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'topbar topbar--ink' },
  templateUrl: './top-bar.html',
})
export class TopBar {
  readonly member = input.required<ChromeMember | null>();
  readonly current = input<ChromeSection>(null);
  /** The query to keep in the search box, on the search page. */
  readonly query = input('');
  /** True while the device is offline: search needs a connection, so the box is disabled (L2-122). */
  readonly offline = input(false);
  /** Emits the trimmed query when the search box is submitted. */
  readonly searched = output<string>();
  /** Emits the avatar button when the member opens the account menu (L2-019). */
  readonly accountMenu = output<HTMLElement>();

  protected submit(event: Event, query: string): void {
    event.preventDefault();
    this.searched.emit(query.trim());
  }
}
