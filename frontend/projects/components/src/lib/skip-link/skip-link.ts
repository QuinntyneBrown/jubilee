import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * `<a jb-skip-link>Skip to content</a>`: the first focusable element of every page (L2-112). Activating it moves
 * focus to `main`, which must be focusable (`<main id="main" tabindex="-1">`).
 */
@Component({
  selector: 'a[jb-skip-link]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'skip-link',
    href: '#main',
    '(click)': 'skip($event)',
  },
  template: `<ng-content />`,
})
export class SkipLink {
  protected skip(event: Event): void {
    // The router owns the URL; move focus without adding a fragment to it.
    event.preventDefault();
    document.getElementById('main')?.focus();
  }
}
