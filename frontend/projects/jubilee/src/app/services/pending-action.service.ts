import { Injectable } from '@angular/core';
import type { SaveTarget } from './saved.store';

/** The action a visitor started before being asked to join or sign in (L2-012 AC2). */
export type PendingAction =
  | { kind: 'stock-alert'; returnPath: string }
  /** A heart pressed on a card (L2-041 AC9): the item to save once the visitor is back. */
  | { kind: 'save'; returnPath: string; target: SaveTarget };

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

  /** The save remembered for this path, removed as it is read (L2-012 AC4). */
  takeSave(path: string): SaveTarget | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      const action = JSON.parse(raw) as PendingAction;
      if (action.kind !== 'save' || action.returnPath !== path) return null;
      sessionStorage.removeItem(KEY);
      return action.target;
    } catch {
      return null;
    }
  }
}
