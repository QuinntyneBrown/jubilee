/** A role of a staff account (L2-193). */
export type StaffRole = 'verifier' | 'admin';

/** The answer of `GET /api/staff/session`: the staff member signed in to the admin application (L2-190). */
export interface StaffSessionDto {
  displayName: string;
  initials: string;
  email: string;
  roles: StaffRole[];
  /** The listings ready to review, for the admin bar (L2-098 criterion 3). */
  verificationCount: number;
}
