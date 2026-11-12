import { Injectable } from '@angular/core';
import { DraftValues } from './draft-source';

/** A draft as the device keeps it. */
export interface Draft {
  /** The member who typed it (`draftOwner`). */
  owner: string;
  /** The address of the page the form was on. */
  address: string;
  /** The form on that page. */
  key: string;
  values: DraftValues;
  /** When it was saved, in milliseconds. */
  savedAt: number;
}

const KEY = 'jubilee-drafts';
/** A draft is kept for 30 days (L2-116 AC4). */
const LIFETIME = 30 * 24 * 60 * 60 * 1000;

/**
 * DraftStore (L2-116, ADR 0045): the drafts of this device, in the browser's storage. A draft is
 * given back once, and only to the member who typed it. Nothing here reaches the server.
 */
@Injectable({ providedIn: 'root' })
export class DraftStore {
  save(owner: string, address: string, key: string, values: DraftValues): void {
    const others = this.read().filter(
      (draft) => !(draft.owner === owner && draft.address === address && draft.key === key),
    );
    this.write([...others, { owner, address, key, values, savedAt: Date.now() }]);
  }

  /** The draft of this member for this form, removed as it is read. */
  take(owner: string, address: string, key: string): DraftValues | null {
    const drafts = this.read();
    const found = drafts.find(
      (draft) => draft.owner === owner && draft.address === address && draft.key === key,
    );
    if (!found) return null;
    this.write(drafts.filter((draft) => draft !== found));
    return found.values;
  }

  /** Removes every draft that is not this member's: another member is using the device. */
  keepOnly(owner: string): void {
    const drafts = this.read();
    const own = drafts.filter((draft) => draft.owner === owner);
    if (own.length !== drafts.length) this.write(own);
  }

  private read(): Draft[] {
    try {
      const drafts = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Draft[];
      const oldest = Date.now() - LIFETIME;
      return Array.isArray(drafts) ? drafts.filter((draft) => draft.savedAt >= oldest) : [];
    } catch {
      return [];
    }
  }

  private write(drafts: Draft[]): void {
    try {
      if (drafts.length === 0) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(drafts));
    } catch {
      // Without storage nothing is kept; the member types it again.
    }
  }
}
