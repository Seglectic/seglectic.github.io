import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import path from 'path';
import { generateThumbnail } from '../lib/thumbnail.js';
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
  // Keep the grid usable after the wider form split.
  return Math.max(1, Math.floor((mediaWidth + THUMB_GAP) / 30));
}

export default function MediaPane({ mediaList, onMediaChange, focused, mouseClick, onModeChange, width }) {
  const [selected, setSelected] = useState(0);
  const [thumbnails, setThumbnails] = useState({});
  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [rolePickerAnchor, setRolePickerAnchor] = useState(null);

  const perRow = perRowCount(width);
  const tCols = thumbCols(width, perRow);
  const headerRows = 2;
  const itemRows = THUMB_CHAR_ROWS + 2; // label + thumb + gap
  const safe = Math.min(selected, Math.max(0, mediaList.length - 1));
  const thumbKey = src => `${src}:${tCols}x${THUMB_CHAR_ROWS}`;

  // Generate thumbnails for new items
  useEffect(() => {
    for (const item of mediaList) {
      const key = thumbKey(item.src);
      if (thumbnails[key] !== undefined) continue;
      setThumbnails(prev => ({ ...prev, [key]: { status: 'loading' } }));
      generateThumbnail(item.src, { charWidth: tCols, charRows: THUMB_CHAR_ROWS }).then(result => {
        setThumbnails(prev => ({
          ...prev,
          [key]: result
            ? { status: 'ready', data: result }
            : { status: 'failed' },
        }));
      });
    }
  }, [mediaList, tCols, thumbnails]);

  useEffect(() => {
    if (typeof onModeChange === 'function') {
      onModeChange({ addMode: false, rolePickerVisible });
    }
  }, [rolePickerVisible, onModeChange]);

  // Mouse click: map row/col to exact thumbnail or role option
  useEffect(() => {
    if (mouseClick == null || !focused) return;
    const localRow = mouseClick.row - headerRows;

    if (mediaList.length === 0) return;

    if (rolePickerVisible && rolePickerAnchor) {
      const pickerTop = rolePickerAnchor.top;
      const pickerBottom = pickerTop + 2;
      if (mouseClick.row >= pickerTop && mouseClick.row <= pickerBottom) {
        const localCol = mouseClick.col;
        if (localCol >= 11 && localCol <= 18) { assignRole('hero'); setRolePickerVisible(false); return; }
        if (localCol >= 20 && localCol <= 30) { assignRole('preview'); setRolePickerVisible(false); return; }
        if (localCol >= 32 && localCol <= 40) { assignRole('image'); setRolePickerVisible(false); return; }
      } else {
        setRolePickerVisible(false);
      }
    }

    if (localRow < 0) return;
    const gridRow = Math.floor(localRow / itemRows);
    const rowOffset = localRow % itemRows;
    if (rowOffset >= itemRows - 1) return;

    const cellWidth = tCols + THUMB_GAP;
    const gridCol = Math.floor(mouseClick.col / cellWidth);
    if (gridCol < 0 || gridCol >= perRow) return;
    const colOffset = mouseClick.col % cellWidth;
    if (colOffset >= tCols) return;

    const idx = gridRow * perRow + gridCol;
    if (idx >= 0 && idx < mediaList.length) {
      setSelected(idx);
      if (rolePickerVisible && selected === idx) {
        setRolePickerVisible(false);
      } else {
        setRolePickerVisible(true);
        setRolePickerAnchor({ top: headerRows + (gridRow + 1) * itemRows });
      }
    }
  }, [mouseClick, focused, mediaList, perRow, rolePickerVisible, rolePickerAnchor, selected, tCols]);

  function assignRole(role) {
    const s = Math.min(selected, mediaList.length - 1);
    onMediaChange(mediaList.map((m, i) => i === s ? { ...m, role } : m));
  }

  useInput((input, key) => {
    if (!focused) return;

    if (rolePickerVisible) {
      const map = { h: 'hero', p: 'preview', i: 'image' };
      if (map[input]) { assignRole(map[input]); setRolePickerVisible(false); return; }
      if (key.escape || input === 'q') { setRolePickerVisible(false); return; }
      return;
    }

    const total = mediaList.length;
    if (total === 0) return;

    const clamp = n => Math.max(0, Math.min(total - 1, n));

    if (key.leftArrow)  { setSelected(s => clamp(s - 1)); return; }
    if (key.rightArrow) { setSelected(s => clamp(s + 1)); return; }
    if (key.upArrow)    { setSelected(s => clamp(s - perRow)); return; }
    if (key.downArrow)  { setSelected(s => clamp(s + perRow)); return; }
    if (key.return || input === 'r' || input === ' ') {
      setRolePickerVisible(true);
      setRolePickerAnchor({
        top: 2 + (Math.floor(safe / perRow) + 1) * itemRows,
      });
      return;
    }
    if (key.delete || key.backspace) {
      onMediaChange(mediaList.filter((_, i) => i !== selected));
      setSelected(s => clamp(s - 1));
    }
  }, { isActive: focused });

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
    mediaList.length === 0 && h(
      Box,
      { flexDirection: 'column' },
      h(Text, { color: T.dim },
        'Drop images into the terminal to attach them',
      ),
    ),

    // Thumbnail grid
    ...rows.map((row, ri) =>
      h(Box, { key: ri, flexDirection: 'row', gap: THUMB_GAP, marginBottom: 1 },
        ...row.map(({ m, idx }) => {
          const isSelected = focused && idx === safe;
          const thumb = thumbnails[thumbKey(m.src)];
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
            thumb?.status === 'ready' && thumb.data?.lines
              ? h(Box, { flexDirection: 'column', width: tCols, overflow: 'hidden' },
                  ...thumb.data.lines.map((line, li) => h(Text, { key: li }, line)),
                )
              : thumb?.status === 'loading'
                ? h(Box, { width: tCols, height: THUMB_CHAR_ROWS, alignItems: 'center', justifyContent: 'center' },
                    h(Text, { color: T.dim }, '⋯'),
                  )
                : h(Box, { width: tCols, height: THUMB_CHAR_ROWS, alignItems: 'center', justifyContent: 'center' },
                    h(Text, { color: T.dim }, 'preview unavailable'),
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

    // Hints
    focused && !rolePickerVisible && mediaList.length > 0 && h(
      Box, { flexDirection: 'row', gap: 2, marginTop: 1 },
      h(Text, { color: T.dim }, 'Enter role'),
      h(Text, { color: T.dim }, 'Del remove'),
      h(Text, { color: T.dim }, 'arrows move'),
    ),
  );
}
