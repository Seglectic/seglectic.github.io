import { getImage, type ImageMetadata } from 'astro:assets';

const previewImages = import.meta.glob('/src/content/{projects,devlog}/**/preview.{avif,AVIF,bmp,BMP,gif,GIF,jpeg,JPEG,jpg,JPG,png,PNG,tif,TIF,tiff,TIFF,webp,WEBP}', {
  eager: true,
  import: 'default',
}) as Record<string, ImageMetadata>;

const previewVectors = import.meta.glob('/src/content/{projects,devlog}/**/preview.{svg,SVG}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function siblingPreviewFor(filePath?: string) {
  if (!filePath) return undefined;

  const contentDir = filePath.replace(/\/[^/]+$/, '');
  const normalizedDir = contentDir.startsWith('/') ? contentDir : `/${contentDir}`;

  const raster = Object.entries(previewImages).find(([path]) => path.startsWith(`${normalizedDir}/preview.`));
  if (raster) return { kind: 'raster' as const, source: raster[1] };

  const vector = Object.entries(previewVectors).find(([path]) => path.startsWith(`${normalizedDir}/preview.`));
  if (vector) return { kind: 'vector' as const, source: vector[1] };

  return undefined;
}

export async function getSocialPreviewUrl(filePath?: string) {
  const preview = siblingPreviewFor(filePath);
  if (!preview) return undefined;

  if (preview.kind === 'vector') {
    return preview.source;
  }

  const optimized = await getImage({
    src: preview.source,
    format: 'jpg',
    width: 1200,
    height: 630,
    fit: 'cover',
    quality: 86,
  });

  return optimized.src;
}
