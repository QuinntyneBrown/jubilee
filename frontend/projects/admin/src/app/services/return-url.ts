/** The screens of the admin application a sign-in may return to (L2-189 AC7), as the API checks them. */
const SCREEN = /^\/(verifications|reports)(\/[A-Za-z0-9-]+)?$|^\/featured$/;

/** `returnUrl` when it is a screen of the admin application, else the verification queue. */
export function screenOrQueue(returnUrl: unknown): string {
  return typeof returnUrl === 'string' && SCREEN.test(returnUrl) ? returnUrl : '/verifications';
}
