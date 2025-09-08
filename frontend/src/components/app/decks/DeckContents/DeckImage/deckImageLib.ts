import { DECK_IMAGE_CANVAS_WIDTH_DEFAULT } from '@/components/app/decks/DeckContents/DeckImage/DeckImage.tsx';

export type DeckCardVariantMap = Record<string, string | undefined>;

export type ExportFormat = 'image/webp' | 'image/jpeg' | 'image/png';

export function exportCanvasBlob(
  sourceCanvas: HTMLCanvasElement,
  options?: {
    format?: ExportFormat; // preferred format
    quality?: number; // 0..1
    targetWidth?: number | null; // if set, scale to this width
  },
): Promise<Blob> {
  const format = options?.format ?? 'image/webp';
  const quality = options?.quality ?? 0.82;
  const targetWidth = options?.targetWidth ?? DECK_IMAGE_CANVAS_WIDTH_DEFAULT;

  // If no scaling is requested, export straight from source
  const needsScale = !!targetWidth && sourceCanvas.width > targetWidth;

  const makeBlob = (canvas: HTMLCanvasElement, mime: ExportFormat): Promise<Blob> =>
    new Promise((resolve, reject) => {
      // Prefer toBlob over toDataURL for memory/perf
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null'))),
        mime,
        quality,
      );
    });

  const tryFormats: ExportFormat[] =
    format === 'image/webp'
      ? ['image/webp', 'image/jpeg', 'image/png']
      : format === 'image/jpeg'
        ? ['image/jpeg', 'image/webp', 'image/png']
        : ['image/png', 'image/webp', 'image/jpeg'];

  const exportFrom = (canvas: HTMLCanvasElement): Promise<Blob> =>
    (async () => {
      for (const mime of tryFormats) {
        try {
          // Some browsers may “succeed” but return PNG when unsupported; we still get a Blob.
          const blob = await makeBlob(canvas, mime as ExportFormat);
          if (blob && blob.size > 0) return blob;
        } catch {}
      }
      // Last resort: PNG
      return makeBlob(canvas, 'image/png');
    })();

  if (!needsScale) {
    return exportFrom(sourceCanvas);
  }

  // Scale down to targetWidth keeping aspect ratio
  const scale = targetWidth / sourceCanvas.width;
  const targetHeight = Math.round(sourceCanvas.height * scale);

  const out = document.createElement('canvas');
  out.width = targetWidth;
  out.height = targetHeight;

  const ctx = out.getContext('2d')!;
  // Best quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, out.width, out.height);

  return exportFrom(out);
}

export function pickClipboardMime(): 'image/png' | 'image/jpeg' {
  // Chrome supports ClipboardItem.supports; Safari sometimes only accepts PNG
  try {
    // Prefer JPEG if supported and you want slightly smaller clipboard bytes:
    if (typeof (window as any).ClipboardItem?.supports === 'function') {
      if ((window as any).ClipboardItem.supports('image/jpeg')) return 'image/jpeg';
    }
  } catch {}
  return 'image/png';
}
