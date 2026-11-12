import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/** A page that can have typed changes the member has not saved. */
export interface HasUnsavedChanges {
  confirmLeave(): boolean | Observable<boolean>;
}

/**
 * Asks before leaving a page with unsaved changes (L2-013 AC6). A member whose session has ended
 * is not asked: they cannot stay, and what they typed is kept as a draft (L2-116).
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (
  page,
  _route,
  _current,
  next,
) => (next.url.startsWith('/session-expired') ? true : page.confirmLeave());
