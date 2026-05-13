#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './ui/App.js';
import { scanProjects } from './lib/projects.js';
import { installMouseInterceptor } from './lib/mouse.js';

const dryRun = process.argv.includes('--dry-run');
const { existingLabels, existingSlugs, nextOrder } = scanProjects();

// Patch stdin.emit to strip mouse sequences before Ink or any TextInput sees them
const uninstallMouse = installMouseInterceptor();

// Clear screen, move cursor home, hide cursor, enable SGR mouse tracking
process.stdout.write('\x1b[2J\x1b[H\x1b[?25l\x1b[?1000h\x1b[?1006h');

process.on('exit', () => {
  process.stdout.write('\x1b[?1000l\x1b[?1006l\x1b[?25h\x1b[2J\x1b[H');
  uninstallMouse();
});

render(React.createElement(App, { existingLabels, existingSlugs, nextOrder, dryRun }));
