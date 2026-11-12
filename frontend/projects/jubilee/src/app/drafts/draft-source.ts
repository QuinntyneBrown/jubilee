/** What a form held when it was saved: the value of each named control. */
export type DraftValues = Record<string, string | boolean>;

/**
 * DraftSource (L2-116): something on the page that holds text a member has typed and not yet
 * sent. `key` names it among the sources of one address.
 */
export interface DraftSource {
  readonly key: string;
  /** What is typed now, or null when there is nothing worth keeping. */
  snapshot(): DraftValues | null;
  /** Puts back what was typed. */
  restore(values: DraftValues): void;
}
