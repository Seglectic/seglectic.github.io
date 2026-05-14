import React from 'react';
import { Box, Text } from 'ink';
import { T } from './theme.js';

const { createElement: h } = React;

const Hint = ({ k, label }) =>
  h(Box, { flexDirection: 'row', gap: 0 },
    h(Text, { color: T.accent, bold: true }, k),
    h(Text, { color: T.muted }, ` ${label}  `),
  );

export default function StatusBar({ errors, dryRun, saved, width }) {
  const hasErrors = errors && errors.length > 0;

  return h(
    Box,
    {
      width,
      borderStyle: 'single',
      borderColor: T.dim,
      borderTop: true,
      borderBottom: false,
      borderLeft: false,
      borderRight: false,
      paddingX: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 1,
    },
    dryRun && h(Box, { marginRight: 1 },
      h(Text, { bold: true, color: T.amber }, 'DRY RUN'),
    ),
    saved
      ? h(Text, { color: T.cyan, bold: true }, '✓  saved')
      : hasErrors
        ? h(Text, { color: T.accent }, `✕  ${errors[0]}`)
        : h(Text, { color: T.dim }, '○  ready'),
    h(Box, { flexGrow: 1 }),
    h(Hint, { k: 'Tab', label: 'focus' }),
    h(Hint, { k: '^S', label: 'save' }),
    h(Hint, { k: 'Esc/^C', label: 'exit' }),
  );
}
