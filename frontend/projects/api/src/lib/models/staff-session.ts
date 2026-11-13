/** A role of a staff account (L2-193). */
export type StaffRole = 'moderator' | 'admin';

/** The answer of `GET /api/staff/session`: the staff member signed in to the admin application (L2-190). */
export interface StaffSessionDto {
  displayName: string;
  initials: string;
  email: string;
  roles: StaffRole[];
}
