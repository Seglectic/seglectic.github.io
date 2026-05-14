import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { T } from './theme.js';

const { createElement: h } = React;

const STATUS_OPTIONS = [
  { label: 'prototype', value: 'prototype' },
  { label: 'active',    value: 'active' },
  { label: 'released',  value: 'released' },
  { label: 'shelved',   value: 'shelved' },
  { label: 'archived',  value: 'archived' },
];

export const FIELDS = [
  'title', 'slug', 'tagline', 'label', 'status',
  'summary', 'tags', 'github', 'demo', 'docs', 'featured', 'order',
];

const LABEL_W = 9;

function Row({ label, focused, children, warning }) {
  return h(Box, { flexDirection: 'column' },
    h(Box, { flexDirection: 'row', gap: 1 },
      h(Text, { color: focused ? T.accent : T.dim, bold: focused, width: LABEL_W }, label),
      h(Box, { flexGrow: 1 }, children),
    ),
    warning && h(Text, { color: T.amber }, `${''.padStart(LABEL_W + 1)}⚠ ${warning}`),
  );
}

function TextRow({ label, value, onChange, focused, placeholder, warning }) {
  return h(Row, { label, focused, warning },
    focused
      ? h(TextInput, { value, onChange, placeholder: placeholder || '' })
      : h(Text, { color: value ? T.text : T.dim }, value || placeholder || ''),
  );
}

export default function FormPane({ fields, onFieldChange, focusIndex, slugConflict, width }) {

  function field(name, idx) {
    const focused = focusIndex === idx;
    const value = fields[name];

    if (name === 'status') {
      return h(Row, { label: 'status', focused },
        focused
          ? h(SelectInput, {
              items: STATUS_OPTIONS,
              initialIndex: Math.max(0, STATUS_OPTIONS.findIndex(o => o.value === value)),
              onSelect: item => onFieldChange('status', item.value),
              limit: 5,
            })
          : h(Text, { color: T.cyan }, value),
      );
    }

    if (name === 'label') {
      return h(TextRow, {
        label: 'label', value, onChange: v => onFieldChange('label', v),
        focused, placeholder: 'Field Module',
      });
    }

    if (name === 'featured') {
      return h(Row, { label: 'featured', focused },
        h(Text, { color: focused ? T.accent : T.text },
          `[${value ? '×' : ' '}]${focused ? '  Space' : ''}`),
      );
    }

    if (name === 'slug') {
      return h(TextRow, {
        label: 'slug', value, onChange: v => onFieldChange('slug', v), focused,
        placeholder: 'auto', warning: slugConflict ? `"${value}" already exists` : undefined,
      });
    }

    if (name === 'tags') {
      return h(TextRow, {
        label: 'tags', value, onChange: v => onFieldChange('tags', v),
        focused, placeholder: 'a, b, c',
      });
    }

    return h(TextRow, {
      label: name,
      value,
      onChange: v => onFieldChange(name, v),
      focused,
      placeholder:
        name === 'summary' ? 'Short card summary' :
        name === 'github' || name === 'demo' || name === 'docs' ? 'https://...' :
        name === 'order' ? '10' :
        '',
    });
  }

  return h(
    Box,
    {
      flexDirection: 'column',
      width,
      borderStyle: 'single',
      borderColor: T.dim,
      borderRight: true,
      borderLeft: false,
      borderTop: false,
      borderBottom: false,
      paddingX: 1,
    },
    ...FIELDS.map((name, idx) => h(Box, { key: name, flexDirection: 'column' }, field(name, idx))),
  );
}
