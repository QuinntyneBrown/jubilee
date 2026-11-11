import { InjectionToken } from '@angular/core';

/** The address of the Jubilee app, without a trailing slash; every link to the app starts with it. */
export const APP_URL = new InjectionToken<string>('APP_URL');
