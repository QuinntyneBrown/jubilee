/** One drawing instruction of an icon on the 24-unit grid. */
export type IconShape =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number };

const path = (d: string): IconShape => ({ kind: 'path', d });
const circle = (cx: number, cy: number, r: number): IconShape => ({ kind: 'circle', cx, cy, r });
const rect = (x: number, y: number, width: number, height: number, rx: number): IconShape => ({
  kind: 'rect',
  x,
  y,
  width,
  height,
  rx,
});

/** The icons of the design system (docs/design-system/foundations/iconography.html). */
export const ICONS = {
  alert: [path('M12 4 2.500 20h19zM12 10v4M12 17h.01')],
  'alert-circle': [circle(12, 12, 9), path('M12 7v6M12 16h.01')],
  'wifi-off': [
    path(
      'M3 3l18 18M5 12a10 10 0 0 1 4-2.500M19 12a10 10 0 0 0-5-3M8.500 15.500a5 5 0 0 1 7 0M12 19h.01',
    ),
  ],
  'arrow-down': [path('M12 5v14m0 0 6-6m-6 6-6-6')],
  'arrow-left': [path('M19 12H5m0 0 6-6m-6 6 6 6')],
  'arrow-up': [path('M12 19V5m0 0-6 6m6-6 6 6')],
  bag: [path('M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2')],
  bell: [path('M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0')],
  book: [path('M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2zM8 7h6')],
  briefcase: [rect(3, 7, 18, 13, 2), path('M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18')],
  calendar: [rect(4, 5, 16, 15, 2), path('M8 3v4M16 3v4M4 10h16')],
  check: [path('M4 12l6 6L20 6')],
  chart: [path('M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6')],
  'chevron-right': [path('m9 6 6 6-6 6')],
  close: [path('M6 6l12 12M18 6 6 18')],
  clock: [circle(12, 12, 9), path('M12 7v5l3 2')],
  compass: [circle(12, 12, 9), path('m15 9-2 4-4 2 2-4z')],
  edit: [path('M4 20h4L19 9l-4-4L4 16zM13 7l4 4')],
  filter: [path('M4 6h16M7 12h10M10 18h4')],
  flag: [path('M5 21V4h11l-2 4 2 4H5')],
  heart: [path('M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.600-7 10-7 10z')],
  home: [path('M3 12 12 3l9 9M5 10v10h14V10')],
  image: [rect(3, 5, 18, 14, 2), circle(9, 10, 1.5), path('m4 18 5-5 4 4 3-3 4 4')],
  info: [circle(12, 12, 9), path('M12 11v5M12 8h.01')],
  lock: [rect(5, 11, 14, 9, 2), path('M8 11V8a4 4 0 0 1 8 0v3')],
  message: [path('M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z')],
  mug: [path('M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h2a2 2 0 0 1 0 5h-2M8 4v1M12 4v1')],
  mail: [rect(3, 5, 18, 14, 2), path('m3 7 9 6 9-6')],
  plus: [path('M12 5v14M5 12h14')],
  refresh: [path('M4 12a8 8 0 0 1 14-5l2 2M20 5v4h-4M20 12a8 8 0 0 1-14 5l-2-2M4 19v-4h4')],
  search: [circle(11, 11, 7), path('m20 20-3.5-3.5')],
  send: [path('M4 12 20 4l-5 16-3-7z')],
  'sign-out': [path('M10 4H5v16h5M15 8l4 4-4 4M19 12H9')],
  share: [path('M12 3v12m0-12L8 7m4-4 4 4M5 13v6h14v-6')],
  shield: [path('M12 3 5 6v6c0 4.500 3 8 7 9 4-1 7-4.500 7-9V6z')],
  shirt: [path('M8 4 3 7l2 4 2-1v10h10V10l2 1 2-4-5-3a4 4 0 0 1-8 0z')],
  settings: [
    circle(12, 12, 3),
    path(
      'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
    ),
  ],
  store: [
    path(
      'M4 9l1-5h14l1 5M4 9v11h16V9M4 9a3 3 0 0 0 5.3 0 3 3 0 0 0 5.400 0A3 3 0 0 0 20 9M10 20v-6h4v6',
    ),
  ],
  user: [circle(12, 8, 4), path('M4 21a8 8 0 0 1 16 0')],
  verified: [circle(12, 12, 9), path('m8 12 3 3 5-6')],
  trash: [path('M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13')],
  wrench: [path('M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9zM14 6l3-3')],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof ICONS;
