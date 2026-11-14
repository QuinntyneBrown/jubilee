import { parity } from '../../fixtures/parity';
import {
  JumpPaletteNoneScreen,
  JumpPaletteResultsScreen,
  JumpPaletteScreen,
} from '../../pages/jump-palette.dialog';

// jb-command-palette: "Jump to" over the overview with nothing typed (the first ten tables), with
// "ruth" typed (records across the tables) and with nothing that matches (L2-273).
parity('command-palette', {
  cases: [
    {
      name: 'tables',
      route: 'admin-overview.palette',
      screen: (page) => new JumpPaletteScreen(page),
      region: (screen: JumpPaletteScreen) => screen.palette.panel,
    },
    {
      name: 'records',
      route: 'admin-overview.palette-results',
      screen: (page) => new JumpPaletteResultsScreen(page),
      region: (screen: JumpPaletteResultsScreen) => screen.palette.panel,
    },
    {
      name: 'none',
      route: 'admin-overview.palette-none',
      screen: (page) => new JumpPaletteNoneScreen(page),
      region: (screen: JumpPaletteNoneScreen) => screen.palette.panel,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
