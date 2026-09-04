#!/usr/bin/env node
/** Every browser harness, one browser, one preview server, one exit code. `pnpm verify:ui [--preview]`. */
import { main, shutdown } from './lib.mjs';
import { OPTIONS as cockpitOptions, run as cockpit } from './cockpit.mjs';
import { OPTIONS as menubarOptions, run as menubar } from './menubar.mjs';

let fails = 0;
fails += await main(cockpit, cockpitOptions);
fails += await main(menubar, menubarOptions);
await shutdown();
process.exit(fails ? 1 : 0);
