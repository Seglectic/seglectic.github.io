import sharp from 'sharp';
import path from 'path';

const RESET = '\x1b[0m';
// U+10EEEE — Kitty graphics placeholder character
const PLACEHOLDER = '\u{10EEEE}';

const DARK_BG = { r: 15, g: 15, b: 15 };

const kittyIds  = new Map(); // filePath → image id
let nextId      = 1;

export function kittySupported() {
  return (
    process.env.TERM === 'xterm-kitty' ||
    Boolean(process.env.KITTY_WINDOW_ID) ||
    parseInt(process.env.KONSOLE_VERSION || '0', 10) >= 220400 ||
    process.env.TERM_PROGRAM === 'WezTerm'
  );
}

async function uploadKitty(filePath, id) {
  // Upload at a size that gives Kitty enough detail to scale from
  const pngBuf = await sharp(filePath)
    .resize(512, 288, { fit: 'contain', background: DARK_BG })
    .flatten({ background: DARK_BG })
    .png()
    .toBuffer();

  const b64   = pngBuf.toString('base64');
  const CHUNK = 4096;
  for (let i = 0; i < b64.length; i += CHUNK) {
    const chunk = b64.slice(i, i + CHUNK);
    const more  = i + CHUNK < b64.length ? 1 : 0;
    const hdr   = i === 0 ? `a=t,f=100,t=d,i=${id},q=2,m=${more}` : `m=${more}`;
    process.stdout.write(`\x1b_G${hdr};${chunk}\x1b\\`);
  }
}

// Each line: set fg color encoding (id_high, id_low, row), then charWidth placeholder chars.
// Kitty infers the column index automatically from the sequence of consecutive placeholders.
function placeholderLines(id, charWidth, charRows) {
  const hi = (id >> 8) & 0xFF;
  const lo = id & 0xFF;
  const lines = [];
  for (let row = 0; row < charRows; row++) {
    lines.push(`\x1b[38;2;${hi};${lo};${row}m` + PLACEHOLDER.repeat(charWidth) + RESET);
  }
  return lines;
}

export async function generateThumbnail(filePath, { charWidth = 32, charRows = 9 } = {}) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (ext === 'svg') return null;

  if (kittySupported()) {
    try {
      if (!kittyIds.has(filePath)) {
        const id = nextId++;
        await uploadKitty(filePath, id);
        kittyIds.set(filePath, id);
      }
      const id    = kittyIds.get(filePath);
      const lines = placeholderLines(id, charWidth, charRows);
      return { lines, charWidth, charRows, kitty: true };
    } catch {
      // fall through to half-block
    }
  }

  // Half-block fallback — works in any 24-bit colour terminal
  const pixelHeight = charRows * 2;
  try {
    const { data, info } = await sharp(filePath)
      .resize(charWidth, pixelHeight, {
        fit: 'contain',
        background: DARK_BG,
        withoutEnlargement: true,
      })
      .flatten({ background: DARK_BG })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width: w, height: h } = info;
    const lines = [];
    for (let row = 0; row < h - 1; row += 2) {
      let line = '';
      for (let col = 0; col < w; col++) {
        const ti = (row * w + col) * 3;
        const bi = ((row + 1) * w + col) * 3;
        line +=
          `\x1b[38;2;${data[ti]};${data[ti+1]};${data[ti+2]}m` +
          `\x1b[48;2;${data[bi]};${data[bi+1]};${data[bi+2]}m▀`;
      }
      lines.push(line + RESET);
    }
    return { lines, charWidth: w, charRows: lines.length };
  } catch {
    return null;
  }
}
