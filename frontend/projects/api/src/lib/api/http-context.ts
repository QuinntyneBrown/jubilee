import { HttpContextToken } from '@angular/common/http';

/**
 * Set on a write that has its own way of trying again, like a message that goes to the outgoing queue,
 * so the app does not also retry it for a minute (L2-121 AC5).
 */
export const OWN_RETRY = new HttpContextToken<boolean>(() => false);

/**
 * Set on a read whose page has a saved copy to show when the device is offline, so the app does not
 * replace the page with the offline page before the page has looked (L2-122).
 */
export const OWN_OFFLINE_FALLBACK = new HttpContextToken<boolean>(() => false);
