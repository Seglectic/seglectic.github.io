import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import FormPane, { FIELDS } from './FormPane.js';
import MediaPane from './MediaPane.js';
import StatusBar from './StatusBar.js';
import { T } from './theme.js';
import { mouseEmitter, pathEmitter } from '../lib/mouse.js';
import { generateSlug, slugExists } from '../lib/slug.js';
import { projectsDir } from '../lib/paths.js';
import { writeProject, dryRunReport } from '../lib/write-project.js';

const { createElement: h } = React;

const MEDIA_FOCUS = FIELDS.length;

function ExitConfirm({ width }) {
  const boxWidth = Math.min(48, Math.max(32, width - 8));
  return h(
    Box,
    {
      width: boxWidth,
      flexDirection: 'column',
      borderStyle: 'single',
      borderColor: T.accent,
      paddingX: 1,
      paddingY: 0,
    },
    h(Text, { bold: true, color: T.accent }, 'Exit Projenitor?'),
    h(Text, { color: T.muted }, 'Unsaved edits will be lost.'),
    h(Box, { marginTop: 1, flexDirection: 'row', gap: 2 },
      h(Text, { color: T.text }, h(Text, { color: T.accent, bold: true }, 'y'), ' exit'),
      h(Text, { color: T.text }, h(Text, { color: T.accent, bold: true }, 'n'), ' stay'),
      h(Text, { color: T.dim }, 'Esc stay'),
    ),
  );
}

function Header({ width, dryRun }) {
  const right = ' seglectic.com ';
  const title = '  PROJENITOR';
  const badge = dryRun ? ' dry run ' : '';
  const fillLen = Math.max(0, width - title.length - 2 - right.length - badge.length);
  const fill = '─'.repeat(fillLen);
  const sep  = '─'.repeat(width);
  return h(Box, { flexDirection: 'column', width },
    h(Box, { flexDirection: 'row' },
      h(Text, { bold: true, color: T.accent }, title),
      h(Text, { color: T.dim }, '  ' + fill),
      badge && h(Text, { color: T.dim }, badge),
      h(Text, { color: T.dim }, right),
    ),
    h(Text, { color: T.dim }, sep),
  );
}

export default function App({ existingLabels, existingSlugs, nextOrder, dryRun }) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [cols, setCols] = useState(stdout.columns || 120);
  const [rows, setRows] = useState(stdout.rows || 40);

  useEffect(() => {
    const onResize = () => { setCols(stdout.columns); setRows(stdout.rows); };
    stdout.on('resize', onResize);
    return () => stdout.off('resize', onResize);
  }, []);

  const formWidth  = Math.min(Math.max(42, Math.floor(cols * 0.5)), Math.max(42, cols - 26));
  const mediaWidth = cols - formWidth;

  const [fields, setFields] = useState({
    title: '', slug: '', tagline: '', label: 'Field Module',
    status: 'prototype', summary: '', tags: '', github: '',
    demo: '', docs: '', featured: false, order: String(nextOrder),
  });
  const [mediaList, setMediaList]       = useState([]);
  const [focusIndex, setFocusIndex]     = useState(0);
  const [errors, setErrors]           = useState([]);
  const [dropErrors, setDropErrors]   = useState([]);
  const [saved, setSaved]             = useState(false);
  const [mouseClick, setMouseClick] = useState(null);
  const [mediaMode, setMediaMode] = useState({ addMode: false, rolePickerVisible: false });
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);

  const formWidthRef = useRef(formWidth);
  useEffect(() => { formWidthRef.current = formWidth; }, [formWidth]);

  // Drag-and-drop / pasted image paths intercepted at the stdin.push level
  useEffect(() => {
    function onPaths({ valid, errors: errs }) {
      if (valid.length > 0) {
        setMediaList(prev => [...prev, ...valid.map(src => ({ src, role: 'image' }))]);
        setFocusIndex(MEDIA_FOCUS);
      }
      setDropErrors(errs.length > 0 ? errs : []);
    }
    pathEmitter.on('paths', onPaths);
    return () => pathEmitter.off('paths', onPaths);
  }, []);

  // Mouse click routing via filtered mouseEmitter (sequences stripped from stdin)
  useEffect(() => {
    function onMouse({ button, col, row, press }) {
      if (!press || button !== 0) return;
      if (exitConfirmVisible) return;
      if (col >= formWidthRef.current) {
        setFocusIndex(MEDIA_FOCUS);
        setMouseClick({ row, col: col - formWidthRef.current });
      } else {
        // Row 0 = header title, row 1 = separator. Clamp any left-pane click
        // into the form field range so focus always returns to the form.
        const fieldIdx = Math.max(0, Math.min(FIELDS.length - 1, row - 2));
        setFocusIndex(fieldIdx);
        if (row >= 2 && fieldIdx === FIELDS.indexOf('featured')) {
          setFields(prev => ({ ...prev, featured: !prev.featured }));
        }
      }
    }
    mouseEmitter.on('mouse', onMouse);
    return () => mouseEmitter.off('mouse', onMouse);
  }, [exitConfirmVisible]);

  useEffect(() => {
    if (mouseClick !== null) {
      const t = setTimeout(() => setMouseClick(null), 50);
      return () => clearTimeout(t);
    }
  }, [mouseClick]);

  const slugConflict = fields.slug && slugExists(fields.slug, projectsDir());

  function onFieldChange(name, value) {
    setFields(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'title' && prev.slug === generateSlug(prev.title)) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  }

  function validate() {
    const errs = [];
    if (!fields.title.trim())   errs.push('title is required');
    if (!fields.slug.trim())    errs.push('slug is required');
    if (!fields.tagline.trim()) errs.push('tagline is required');
    if (!fields.label.trim())   errs.push('label is required');
    if (!fields.summary.trim()) errs.push('summary is required');
    if (slugConflict)           errs.push(`slug "${fields.slug}" already exists`);
    return errs;
  }

  function buildFieldsForWrite() {
    return {
      ...fields,
      tags: fields.tags.split(',').map(t => t.trim().replace(/^#+/, '')).filter(Boolean),
      github: /^https?:\/\//.test(fields.github) ? fields.github : '',
      demo:   /^https?:\/\//.test(fields.demo)   ? fields.demo   : '',
      docs:   /^https?:\/\//.test(fields.docs)   ? fields.docs   : '',
      order: Number(fields.order) || nextOrder,
    };
  }

  useInput((input, key) => {
    if (saved) return;

    if (exitConfirmVisible) {
      if (input === 'y' || input === 'Y' || (input === 'c' && key.ctrl)) {
        exit();
        return;
      }
      if (input === 'n' || input === 'N' || key.escape) {
        setExitConfirmVisible(false);
        return;
      }
      return;
    }

    // Ctrl+S
    if (input === 's' && key.ctrl) {
      const errs = validate();
      if (errs.length > 0) { setErrors(errs); return; }
      setErrors([]);
      const built = buildFieldsForWrite();
      if (dryRun) {
        const report = dryRunReport(built, mediaList);
        setTimeout(() => { process.stdout.write('\n' + report + '\n'); exit(); }, 100);
        return;
      }
      writeProject(built, mediaList).then(result => {
        if (!result.ok) {
          setErrors(result.errors);
          if (result.written.length > 0)
            process.stderr.write('Partial write:\n' + result.written.join('\n') + '\n');
        } else {
          setSaved(true);
          setTimeout(() => exit(), 800);
        }
      });
      return;
    }

    if (mediaMode.addMode || mediaMode.rolePickerVisible) return;
    if (key.escape || (input === 'c' && key.ctrl)) {
      setExitConfirmVisible(true);
      return;
    }

    // Shift+Tab must be checked before Tab to prevent forward-match short-circuit
    const total = FIELDS.length + 1;
    if (key.shift && key.tab) { setFocusIndex(i => (i - 1 + total) % total); return; }
    if (key.tab)              { setFocusIndex(i => (i + 1) % total); return; }
    if (key.upArrow)          { setFocusIndex(i => (i - 1 + total) % total); return; }
    if (key.downArrow)        { setFocusIndex(i => (i + 1) % total); return; }

    if (focusIndex === FIELDS.indexOf('featured') && (input === ' ' || key.return)) {
      onFieldChange('featured', !fields.featured);
      return;
    }

  });

  const mediaPaneFocused = focusIndex === MEDIA_FOCUS;
  const allErrors = [...errors, ...dropErrors];

  const contentHeight = rows - 3; // header(2) + statusbar(1)

  return h(Box, { flexDirection: 'column', width: cols, height: rows },
    h(Header, { width: cols, dryRun }),
    h(Box, { flexDirection: 'row', height: contentHeight, overflow: 'hidden' },
      h(FormPane, {
        fields, onFieldChange,
        focusIndex: mediaPaneFocused ? -1 : focusIndex,
        slugConflict,
        width: formWidth,
      }),
      h(MediaPane, {
        mediaList, onMediaChange: setMediaList,
        focused: mediaPaneFocused,
        mouseClick: mediaPaneFocused ? mouseClick : null,
        onModeChange: setMediaMode,
        width: mediaWidth,
      }),
    ),
    exitConfirmVisible && h(
      Box,
      { justifyContent: 'center', alignItems: 'center' },
      h(ExitConfirm, { width: cols }),
    ),
    h(StatusBar, { errors: allErrors, dryRun, saved, width: cols }),
  );
}
