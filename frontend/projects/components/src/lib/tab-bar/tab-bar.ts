import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { ChromeMember, ChromeSection } from '../navigation';
import { UnreadBadge } from '../unread-badge/unread-badge';

/**
 * The phone tab bar: the primary navigation under 768 px (L2-112, L2-164). The kit fixes it to
 * the bottom above the safe area, hides it from 768 px and reserves page space while it shows.
 */
@Component({
  selector: 'nav[jb-tab-bar]',
  imports: [RouterLink, Icon, UnreadBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tabbar', 'aria-label': 'Primary, phone' },
  templateUrl: './tab-bar.html',
})
export class TabBar {
  readonly member = input.required<ChromeMember | null>();
  /** Emits when "You" is pressed: the app opens the account menu. */
  readonly accountMenu = output<HTMLElement>();
  readonly current = input<ChromeSection>(null);
}
