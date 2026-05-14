import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import path from 'path';
import { validatePaths } from '../lib/media.js';
import { generateThumbnail } from '../lib/thumbnail.js';
import { interceptorState } from '../lib/mouse.js';
import { T } from './theme.js';

const { createElement: h } = React;

const THUMB_CHAR_ROWS = 9; // terminal rows per thumbnail (= 18 px rows)
const THUMB_GAP = 2;       // cols between thumbs

const ROLE_COLORS = { hero: T.accent, preview: T.cyan, image: T.dim };
const ROLE_LABELS = { hero: 'HERO', preview: 'PREV', image: 'img' };

function thumbCols(mediaWidth, perRow) {
  return Math.max(16, Math.floor((mediaWidth - THUMB_GAP * (perRow + 1)) / perRow));
}

function perRowCount(mediaWidth) {
  // Aim for ~42-char wide thumbnails
  return Math.max(1, Math.floor(mediaWidth / 44));
}

export default function MediaPane({ mediaList, onMediaChange, focused, mouseRow, width }) {
  const [selected, setSelected] = useState(0);
  const [addMode, setAddMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [addError, setAddError] = useState('');
  const [thumbnails, setThumbnails] = useState({});
  const [rolePickerVisible, setRolePickerVisible] = useState(false);

  const perRow = perRowCount(width);
  const tCols = thumbCols(width, perRow);

  // Generate thumbnails for new items
  useEffect(() => {
    for (const item of mediaList) {
      if (thumbnails[item.src] !== undefined) continue;
      setThumbnails(prev => ({ ...prev, [item.src]: null }));
      generateThumbnail(item.src, { charWidth: tCols, charRows: THUMB_CHAR_ROWS }).then(result => {
        setThumbnails(prev => ({ ...prev, [item.src]: result }));
      });
    }
  }, [mediaList, tCols]);

  // Mouse click: map row to thumbnail index
  useEffect(() => {
    if (mouseRow == null || !focused) return;
    const headerRows = 2;
    const itemRows = THUMB_CHAR_ROWS + 2; // label + thumb + gap
    const localRow = mouseRow - headerRows;
    if (localRow < 0) return;
    const gridRow = Math.floor(localRow / itemRows);
    // We don't know exact column split per item from mouseRow alone — select by row, open picker
    const idx = gridRow * perRow;
    if (idx >= 0 && idx < mediaList.length) {
      setSelected(idx);
      setRolePickerVisible(true);
    }
  }, [mouseRow]);

  function assignRole(role) {
    const s = Math.min(selected, mediaList.length - 1);
    onMediaChange(mediaList.map((m, i) => i === s ? { ...m, role } : m));
  }

  useInput((input, key) => {
    if (!focused) return;

    if (addMode) {
      if (key.return) {
        const { valid, errors } = validatePaths([inputValue.trim()]);
        if (errors.length > 0) { setAddError(errors[0]); return; }
        onMediaChange([...mediaList, ...valid.map(src => ({ src, role: 'image' }))]);
        setInputValue('');
        interceptorState.interceptPaths = true;
        setAddMode(false); setAddError('');
      } else if (key.escape) {
        interceptorState.interceptPaths = true;
        setAddMode(false); setInputValue(''); setAddError('');
      }
      return;
    }

    if (rolePickerVisible) {
      const map = { h: 'hero', p: 'preview', i: 'image' };
      if (map[input]) { assignRole(map[input]); setRolePickerVisible(false); return; }
      if (key.escape) { setRolePickerVisible(false); return; }
      return;
    }

    const total = mediaList.length;
    if (total === 0 && input === 'a') { interceptorState.interceptPaths = false; setAddMode(true); return; }
    if (total === 0) return;

    const clamp = n => Math.max(0, Math.min(total - 1, n));

    if (input === 'a') { interceptorState.interceptPaths = false; setAddMode(true); return; }
    if (key.leftArrow)  { setSelected(s => clamp(s - 1)); return; }
    if (key.rightArrow) { setSelected(s => clamp(s + 1)); return; }
    if (key.upArrow)    { setSelected(s => clamp(s - perRow)); return; }
    if (key.downArrow)  { setSelected(s => clamp(s + perRow)); return; }
    if (key.return || input === 'r') { setRolePickerVisible(true); return; }
    if (key.delete || key.backspace) {
      onMediaChange(mediaList.filter((_, i) => i !== selected));
      setSelected(s => clamp(s - 1));
    }
  }, { isActive: focused });

  const safe = Math.min(selected, Math.max(0, mediaList.length - 1));

  // Build grid rows
  const rows = [];
  for (let i = 0; i < mediaList.length; i += perRow) {
    rows.push(mediaList.slice(i, i + perRow).map((m, j) => ({ m, idx: i + j })));
  }

  return h(
    Box,
    { flexDirection: 'column', width, paddingX: 1, paddingTop: 0 },

    // Pane header
    h(Box, { flexDirection: 'row', gap: 2, marginBottom: 1 },
      h(Text, { bold: true, color: focused ? T.accent : T.text }, 'MEDIA'),
      mediaList.length > 0 && h(Text, { color: T.dim }, `${mediaList.length} file${mediaList.length !== 1 ? 's' : ''}`),
    ),

    // Empty state
    mediaList.length === 0 && !addMode && h(
      Box, { flexDirection: 'column', gap: 0 },
      h(Text, { color: T.dim }, 'Drop images into the terminal or press '),
      h(Text, { color: T.dim },
        h(Text, { color: T.muted, bold: true }, 'a'),
        ' to add by path',
      ),
    ),

    // Thumbnail grid
    ...rows.map((row, ri) =>
      h(Box, { key: ri, flexDirection: 'row', gap: THUMB_GAP, marginBottom: 1 },
        ...row.map(({ m, idx }) => {
          const isSelected = focused && idx === safe;
          const thumb = thumbnails[m.src];
          const roleColor = ROLE_COLORS[m.role] || T.dim;
          const roleLabel = ROLE_LABELS[m.role] || 'img';
          const name = path.basename(m.src);
          const display = name.length > tCols - 2 ? '…' + name.slice(-(tCols - 3)) : name;

          return h(
            Box,
            { key: idx, flexDirection: 'column', width: tCols },

            // Label row
            h(Box, { flexDirection: 'row', gap: 1 },
              h(Text, { color: isSelected ? T.accent : T.dim, bold: isSelected },
                isSelected ? '▸' : ' ',
              ),
              h(Text, { color: roleColor, bold: true }, roleLabel),
              h(Text, { color: isSelected ? T.text : T.muted },
                display.slice(0, tCols - roleLabel.length - 3),
              ),
            ),

            // Thumbnail or placeholder
            thumb && thumb.lines
              ? h(Box, { flexDirection: 'column', width: tCols, overflow: 'hidden' },
                  ...thumb.lines.map((line, li) => h(Text, { key: li }, line)),
                )
              : thumb === null
                ? h(Box, { width: tCols, height: THUMB_CHAR_ROWS, alignItems: 'center', justifyContent: 'center' },
                    h(Text, { color: T.dim }, '⋯'),
                  )
                : h(Box, { width: tCols, height: THUMB_CHAR_ROWS, alignItems: 'center', justifyContent: 'center' },
                    h(Text, { color: T.dim }, '∅'),
                  ),
          );
        }),
      ),
    ),

    // Role picker
    rolePickerVisible && mediaList.length > 0 && h(
      Box,
      { flexDirection: 'row', gap: 3, marginTop: 1, paddingX: 1,
        borderStyle: 'single', borderColor: T.dim },
      h(Text, { color: T.muted }, 'set role:'),
      h(Text, null, h(Text, { color: T.accent, bold: true }, 'h'), h(Text, { color: T.muted }, ' hero')),
      h(Text, null, h(Text, { color: T.cyan,   bold: true }, 'p'), h(Text, { color: T.muted }, ' preview')),
      h(Text, null, h(Text, { color: T.dim,    bold: true }, 'i'), h(Text, { color: T.muted }, ' image')),
      h(Text, { color: T.dim }, ' Esc cancel'),
    ),

    // Add mode input
    addMode && h(
      Box, { flexDirection: 'column', marginTop: 1 },
      h(Text, { color: T.accent }, '+ path:'),
      h(TextInput, { value: inputValue, onChange: setInputValue, placeholder: '/path/to/image.jpg' }),
      addError && h(Text, { color: T.accent }, `✕ ${addError}`),
    ),

    // Hints
    focused && !addMode && !rolePickerVisible && mediaList.length > 0 && h(
      Box, { flexDirection: 'row', gap: 2, marginTop: 1 },
      h(Text, { color: T.dim }, 'r role'),
      h(Text, { color: T.dim }, 'a add'),
      h(Text, { color: T.dim }, 'Del remove'),
      h(Text, { color: T.dim }, 'arrows navigate'),
    ),
  );
}
