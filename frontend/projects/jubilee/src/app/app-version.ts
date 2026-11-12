import { InjectionToken } from '@angular/core';

/** The version of the app, which a bug report carries (L2-210 AC4, L2-214). */
export const APP_VERSION = new InjectionToken<string>('APP_VERSION');
