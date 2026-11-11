import { Injectable, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';

/**
 * Remembers the address the member asked for before the app showed the forbidden page, so "Ask for
 * access" can say which page it was (L2-114 AC2). Pages that are not an error page replace it.
 */
@Injectable({ providedIn: 'root' })
export class NavigationTrail {
  private asked = '/';

  constructor() {
    inject(Router).events.subscribe((event) => {
      if (event instanceof NavigationStart && !isSystemPage(event.url)) this.asked = event.url;
    });
  }

  /** The last page that was asked for and was not a system page. */
  get blocked(): string {
    return this.asked;
  }
}

/** The pages the app shows when something went wrong; none of them is a place to come back to. */
export function isSystemPage(url: string): boolean {
  return /^\/(forbidden|error|maintenance)(\/|\?|$)/.test(url);
}

const BACKSLASH = String.fromCharCode(92);

/** An address to go back to from a system page: a path of this app, never a system page itself. */
export function returnTo(value: string | null): string {
  return value && /^\/(?!\/)/.test(value) && !value.includes(BACKSLASH) && !isSystemPage(value)
    ? value
    : '/';
}
