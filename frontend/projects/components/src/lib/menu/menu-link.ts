import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * One line of a `jb-menu-list`: a link, or a button, drawn as a menu item.
 *
 *     <a jb-menu-link icon="user" routerLink="/account">Your account</a>
 *     <button jb-menu-link icon="sign-out" type="button" (click)="signOut()">Sign out</button>
 *
 * It is not a `menuitem`: it keeps the role of its element and is reached with Tab, so it is for
 * a list of places to go inside a dialog or a page. The actions a trigger opens are a `jb-menu`
 * of `jb-menu-item`.
 */
@Component({
  selector: 'a[jb-menu-link], button[jb-menu-link]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'menu__item', '[class.menu__item--danger]': 'danger()' },
  templateUrl: './menu-link.html',
  styleUrl: './menu-link.scss',
})
export class MenuLink {
  readonly icon = input<IconName | null>(null);
  /** A link or an action that removes or reports something. */
  readonly danger = input(false, { transform: booleanAttribute });
}
