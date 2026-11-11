import { Injectable } from '@angular/core';
import { sanitiseReturnUrl } from './return-url';

const KEY = 'jubilee-return-after-join';
const DAY = 24 * 60 * 60 * 1000;

/**
 * Where a visitor was going when they were asked to join (L2-012 AC5). The confirmation link
 * usually opens in a new tab, so the path is kept for the browser, not for the tab, and for as
 * long as the link works: 24 hours. Only a path of this app is kept or given back.
 */
@Injectable({ providedIn: 'root' })
export class ReturnAfterJoinService {
  remember(returnUrl: string): void {
    const path = sanitiseReturnUrl(returnUrl);
    if (path === '/') return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
    } catch {
      // Without storage the member starts from browse after confirming.
    }
  }

  /** The remembered path, or null. Reading it does not remove it: the page may be reloaded. */
  peek(): string | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const kept = JSON.parse(raw) as { path?: unknown; at?: unknown };
      if (typeof kept.path !== 'string' || typeof kept.at !== 'number') return null;
      if (Date.now() - kept.at > DAY) return null;
      const path = sanitiseReturnUrl(kept.path);
      return path === '/' ? null : path;
    } catch {
      return null;
    }
  }

  forget(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing was kept.
    }
  }
}
