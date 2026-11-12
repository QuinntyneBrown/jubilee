import { BadgeTone } from 'components';
import { MemberRequestStatus, RequestKind } from 'api';
import { ToastSpec } from 'components';

/** How a status reads as a badge: the word always says it too. */
export const STATUS_TONE: Record<MemberRequestStatus, BadgeTone | ''> = {
  new: 'warning',
  confirmed: 'success',
  declined: 'danger',
  cancelled: '',
  completed: '',
};

const NOUN: Record<RequestKind, string> = {
  booking: 'meeting',
  quote: 'quote request',
  order: 'order',
  space: 'request',
};

/**
 * The toast for a request whose status changed while the member watched (L2-070). A change the
 * member made themselves, a cancel, is announced by its own toast, so it gives none here.
 */
export function statusChangeToast(
  business: string,
  kind: RequestKind,
  from: MemberRequestStatus,
  to: MemberRequestStatus,
): ToastSpec | null {
  if (from === to) return null;
  const noun = NOUN[kind];
  switch (to) {
    case 'confirmed':
      return { tone: 'success', title: `${business} confirmed your ${noun}`, durationMs: 8000 };
    case 'declined':
      return {
        tone: 'warning',
        title: `${business} declined your ${noun}`,
        text: 'Open the request to read their message.',
        durationMs: 8000,
      };
    case 'completed':
      return { tone: 'info', title: `Your ${noun} with ${business} is complete`, durationMs: 8000 };
    default:
      return null;
  }
}
