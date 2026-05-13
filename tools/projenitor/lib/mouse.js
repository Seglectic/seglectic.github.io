import { EventEmitter } from 'events';
import { validatePaths } from './media.js';

export const mouseEmitter = new EventEmitter();
export const pathEmitter  = new EventEmitter();

// Set to false while the manual "a" add-mode input is open so pasted paths
// reach that TextInput instead of being intercepted here.
export const interceptorState = { interceptPaths: true };

const MOUSE_RE    = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
const IMAGE_EXT   = /\.(jpg|jpeg|png|webp|avif|gif|svg)\s*$/i;
// Match absolute paths (or file:// URIs) that end with an image extension
const FILE_PATH_RE = /(?:file:\/\/)?(\/[^\r\n\t\x1b]+\.(?:jpg|jpeg|png|webp|avif|gif|svg))/gi;

// Intercepts at process.stdin.push — runs before any 'data' event is emitted,
// so neither Ink's input layer nor any TextInput ever sees the swallowed bytes.
export function installMouseInterceptor() {
  const proto = Object.getPrototypeOf(process.stdin);
  const originalPush = proto.push; // Readable.prototype.push

  process.stdin.push = function interceptedPush(chunk, encoding) {
    if (chunk === null) return originalPush.call(this, null, encoding);

    const buf = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(String(chunk), encoding || 'utf8');
    let str = buf.toString('binary');
    let dirty = false;

    // ── Mouse sequences ────────────────────────────────────────────
    MOUSE_RE.lastIndex = 0;
    if (MOUSE_RE.test(str)) {
      MOUSE_RE.lastIndex = 0;
      str = str.replace(MOUSE_RE, (_, btn, col, row, type) => {
        mouseEmitter.emit('mouse', {
          button: parseInt(btn, 10),
          col:    parseInt(col, 10) - 1,
          row:    parseInt(row, 10) - 1,
          press:  type === 'M',
        });
        return '';
      });
      dirty = true;
    }

    // ── Dragged/pasted image paths ─────────────────────────────────
    if (interceptorState.interceptPaths && str.length > 4) {
      FILE_PATH_RE.lastIndex = 0;
      const found = [];
      let m;
      while ((m = FILE_PATH_RE.exec(str)) !== null) {
        found.push(m[1].replace(/\\ /g, ' ').trim());
      }
      if (found.length > 0) {
        // Validate they actually exist before swallowing
        const { valid, errors } = validatePaths(found);
        if (valid.length > 0 || errors.length > 0) {
          pathEmitter.emit('paths', { valid, errors });
          // Remove the matched paths from the stream
          FILE_PATH_RE.lastIndex = 0;
          str = str.replace(FILE_PATH_RE, '').replace(/\s+$/, '');
          dirty = true;
        }
      }
    }

    if (dirty && str.length === 0) return true; // swallowed entirely
    const out = dirty ? Buffer.from(str, 'binary') : buf;
    return originalPush.call(this, out, encoding);
  };

  return function uninstall() {
    delete process.stdin.push; // restore prototype's push
  };
}
