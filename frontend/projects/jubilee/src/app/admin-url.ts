import { InjectionToken } from '@angular/core';

/** The address of the admin application, without a trailing slash (L2-194, ADR 0040). */
export const ADMIN_URL = new InjectionToken<string>('ADMIN_URL');
