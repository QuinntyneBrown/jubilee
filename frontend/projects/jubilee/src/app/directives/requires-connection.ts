import { Directive, ElementRef, effect, inject } from '@angular/core';
import { ConnectionService } from '../services/offline/connection.service';

/** Why the control cannot be used (L2-122 AC3). */
export const REQUIRES_CONNECTION = 'Needs a connection. It works again when you’re back online.';

/**
 * A control that cannot work without a connection. While the device is offline it is disabled and
 * says why, in its title and to a screen reader; a link is held back with `aria-disabled`.
 */
@Directive({ selector: '[jbRequiresConnection]' })
export class RequiresConnection {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly connection = inject(ConnectionService);

  constructor() {
    this.element.addEventListener(
      'click',
      (event) => {
        if (this.connection.isOffline() && this.element.tagName === 'A') {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    effect(() => {
      const offline = this.connection.isOffline();
      const element = this.element;
      if ('disabled' in element) (element as HTMLButtonElement).disabled = offline;
      if (offline) {
        element.setAttribute('aria-disabled', 'true');
        element.setAttribute('title', REQUIRES_CONNECTION);
        element.setAttribute('aria-description', REQUIRES_CONNECTION);
      } else {
        element.removeAttribute('aria-disabled');
        element.removeAttribute('title');
        element.removeAttribute('aria-description');
      }
    });
  }
}
