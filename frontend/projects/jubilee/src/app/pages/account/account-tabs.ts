import { TabItem } from 'components';

/** The pages under "Your account", as the tabs each of them shows. */
export const ACCOUNT_TABS: readonly TabItem[] = [
  { key: 'profile', label: 'Profile', link: '/account' },
  { key: 'notifications', label: 'Notification settings', link: '/account/notifications' },
  { key: 'saved', label: 'Saved', link: '/saved' },
  { key: 'requests', label: 'Your requests', link: '/requests' },
];
