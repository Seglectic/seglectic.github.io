import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const HERO_WIDTH = 1600;
const HERO_FPS = 24;
const HERO_DURATION_SECONDS = 4;
const HERO_MAX_VIDEO_SECONDS = 6;

function usage() {
  console.error('Usage: node tools/generate-hero-video.mjs <source-media> <project-folder>');
  process.exit(1);
}

const [, , sourceArg, projectFolderArg] = process.argv;

if (!sourceArg || !projectFolderArg) {
  usage();
}

const sourcePath = path.resolve(sourceArg);
const projectFolder = path.resolve(projectFolderArg);

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Source media not found: ${sourcePath}`);
}

if (!fs.existsSync(projectFolder) || !fs.statSync(projectFolder).isDirectory()) {
  throw new Error(`Project folder not found: ${projectFolder}`);
}

const sourceExtension = path.extname(sourcePath).toLowerCase();
const sourceIsImage = IMAGE_EXTENSIONS.has(sourceExtension);
const videoOutputPath = path.join(projectFolder, 'hero.webm');
const posterOutputPath = path.join(projectFolder, 'hero-poster.jpg');
const scaleFilter = `scale=${HERO_WIDTH}:-2:force_original_aspect_ratio=decrease`;

const baseInputArgs = sourceIsImage
  ? ['-loop', '1', '-framerate', String(HERO_FPS), '-i', sourcePath]
  : ['-i', sourcePath];

const videoArgs = [
  '-y',
  ...baseInputArgs,
  ...(sourceIsImage ? ['-t', String(HERO_DURATION_SECONDS)] : ['-t', String(HERO_MAX_VIDEO_SECONDS)]),
  '-an',
  '-vf',
  `${scaleFilter},fps=${HERO_FPS},format=yuv420p`,
  '-c:v',
  'libvpx-vp9',
  '-pix_fmt',
  'yuv420p',
  '-b:v',
  '0',
  '-crf',
  '34',
  '-deadline',
  'good',
  '-cpu-used',
  '2',
  '-row-mt',
  '1',
  '-tile-columns',
  '1',
  videoOutputPath,
];

const posterArgs = [
  '-y',
  ...baseInputArgs,
  '-frames:v',
  '1',
  '-vf',
  `${scaleFilter}`,
  posterOutputPath,
];

execFileSync('ffmpeg', videoArgs, { stdio: 'inherit' });
execFileSync('ffmpeg', posterArgs, { stdio: 'inherit' });

console.log(`Generated ${path.relative(process.cwd(), videoOutputPath)}`);
console.log(`Generated ${path.relative(process.cwd(), posterOutputPath)}`);
