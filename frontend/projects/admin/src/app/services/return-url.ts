/** The screens of the admin application a sign-in may return to (L2-189 AC7), as the API checks them. */
const SCREEN = /^\/(listings|reports)(\/[A-Za-z0-9-]+)?$|^\/featured$/;

/** `returnUrl` when it is a screen of the admin application, else the overview (L2-188 AC2). */
export function screenOrQueue(returnUrl: unknown): string {
  return typeof returnUrl === 'string' && SCREEN.test(returnUrl) ? returnUrl : '/';
}
