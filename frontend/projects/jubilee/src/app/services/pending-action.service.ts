import { Injectable } from '@angular/core';

/** The action a visitor started before being asked to join or sign in (L2-012 AC2). */
export interface PendingAction {
  kind: 'stock-alert';
  returnPath: string;
}

const KEY = 'jubilee-pending-action';

/**
 * PendingActionService keeps at most one started action for the tab. After sign-in the page the
 * visitor returns to takes it and carries it on, so they do not press the button twice.
 */
@Injectable({ providedIn: 'root' })
export class PendingActionService {
  remember(action: PendingAction): void {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(action));
    } catch {
      // Without storage the visitor presses the button again.
    }
  }

  /** The remembered action of this kind for this path, removed as it is read. */
  take(kind: PendingAction['kind'], path: string): boolean {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return false;
      const action = JSON.parse(raw) as PendingAction;
      if (action.kind !== kind || action.returnPath !== path) return false;
      sessionStorage.removeItem(KEY);
      return true;
    } catch {
      return false;
    }
  }
}
