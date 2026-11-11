/**
 * ReturnUrl (L2-012 AC3): after signing in a member is taken back to where they were, but only
 * to a path of this app. Anything else, such as another site, `//host` or a script, becomes `/`.
 */
export function sanitiseReturnUrl(value: string | null | undefined): string {
  if (!value || value[0] !== '/' || value.length > 2000) return '/';
  if (value.length > 1 && (value[1] === '/' || value[1] === '\\')) return '/';
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u001f\u007f\\]/.test(value) ? '/' : value;
}
