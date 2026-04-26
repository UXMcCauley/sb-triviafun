'use client';

// Centralized side-effect imports for Material Web.
// Keep this file lean: import only what we use in the app (for now).

import '@material/web/switch/switch.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/chips/chip-set.js';
import '@material/web/chips/filter-chip.js';

// Typography helper (applies M3 type scale classes like `md-typescale-title-medium`)
import { styles as typescaleStyles } from '@material/web/typography/md-typescale-styles.js';

if (typeof document !== 'undefined') {
  // Material Web uses constructed stylesheets for global typography styles.
  // This is the recommended setup in their quick start.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any).adoptedStyleSheets?.push(typescaleStyles.styleSheet);
}

