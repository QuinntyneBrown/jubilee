import { TabItem } from 'components';

/** The pages of the verification team, as the tabs each of them shows under its title. */
export const TEAM_TABS: readonly TabItem[] = [
  { key: 'verifications', label: 'Verifications', link: '/admin/verifications' },
  { key: 'reports', label: 'Reports', link: '/admin/reports' },
  { key: 'featured', label: 'Featured', link: '/admin/featured' },
];
