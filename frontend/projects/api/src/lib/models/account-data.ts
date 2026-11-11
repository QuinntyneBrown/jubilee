/** Downloading a copy of the data and deleting the account (L2-017, L2-018). */

export type DataExportState = 'none' | 'requested' | 'ready' | 'expired' | 'failed';

export interface DataExportStatus {
  status: DataExportState;
  requestedAt: string | null;
  readyAt: string | null;
  expiresAt: string | null;
}

/** What the delete-account dialog names and counts. */
export interface DeletionSummary {
  name: string;
  email: string;
  conversations: number;
  openRequests: number;
}
