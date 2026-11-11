import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/** A page that can have typed changes the member has not saved. */
export interface HasUnsavedChanges {
  confirmLeave(): boolean | Observable<boolean>;
}

/** Asks before leaving a page with unsaved changes (L2-013 AC6). */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (page) =>
  page.confirmLeave();
