import { Injectable, signal } from '@angular/core';

/**
 * What a screen found out about itself once its data answered: the table or record is not for the
 * staff member's role, or it does not exist (L2-188 AC4, AC7). The root stamps it on
 * `<body data-page>` in place of the route's page; moving to another screen clears it.
 */
@Injectable({ providedIn: 'root' })
export class AdminScreenService {
  readonly outcome = signal<'admin-only' | 'admin-not-found' | null>(null);
}
