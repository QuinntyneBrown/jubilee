import { HttpErrorResponse } from '@angular/common/http';

/** The states of a region that loads from the API (present-load-states). */
export type LoadState<T> =
  { status: 'loading' } | { status: 'loaded'; value: T } | { status: 'error'; reference: string };

/**
 * The error reference a load-error state quotes (L2-118). The API names it in its
 * ProblemDetails; when no answer arrived at all, the area's `503` reference is used.
 */
export function errorReference(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const reference = (error.error as { reference?: unknown } | null)?.reference;
    if (typeof reference === 'string' && /^JB-[A-Z0-9-]+$/.test(reference)) return reference;
  }
  return fallback;
}
