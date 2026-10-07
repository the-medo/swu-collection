import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { cn } from '@/lib/utils.ts';
import {
  moveImageCrop,
  resizeImageCropFromCorner,
  type ImageCrop,
  type ImageDimensions,
} from './imageCropGeometry.ts';

export function ImageCropCanvas({
  src,
  name,
  dimensions,
  crop,
  busy,
  minimumWidth,
  minimumHeight,
  className,
  imageClassName,
  onLoad,
  onError,
  onChange,
}: {
  src: string;
  name: string;
  dimensions?: ImageDimensions;
  crop?: ImageCrop;
  busy: boolean;
  minimumWidth: number;
  minimumHeight: number;
  className?: string;
  imageClassName?: string;
  onLoad(dimensions: ImageDimensions): void;
  onError(): void;
  onChange(crop: ImageCrop): void;
}) {
  const overlay = useRef<SVGSVGElement>(null);
  const [handleRadius, setHandleRadius] = useState(10);
  const hasCrop = !!crop;
  const handleClipId = useId();
  const smallCrop = crop && Math.min(crop.width, crop.height) < handleRadius * 4;
  const shadePath =
    dimensions &&
    crop &&
    `M0 0H${dimensions.width}V${dimensions.height}H0Z M${crop.left} ${crop.top}h${crop.width}v${crop.height}h-${crop.width}Z`;
  // Keep the centre draggable without losing the resize handle at image edges.
  const handleClipPath =
    dimensions &&
    crop &&
    `M0 0H${dimensions.width}V${dimensions.height}H0Z M${crop.left + crop.width / 4} ${crop.top + crop.height / 4}h${crop.width / 2}v${crop.height / 2}h-${crop.width / 2}Z`;
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    crop: ImageCrop;
    resize: boolean;
  } | null>(null);
  useEffect(() => {
    const svg = overlay.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => {
      const matrix = svg.getScreenCTM();
      const scale = matrix && Math.hypot(matrix.a, matrix.b);
      if (scale && Number.isFinite(scale)) setHandleRadius(12 / scale);
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [dimensions?.width, dimensions?.height, hasCrop]);
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      : null;
  };
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-muted', className)}>
      <img
        src={src}
        alt={name}
        draggable={false}
        className={cn('block h-auto w-full object-contain', imageClassName)}
        onError={onError}
        onLoad={event =>
          onLoad({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          })
        }
      />
      {dimensions && crop && (
        <svg
          ref={overlay}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
          className={cn(
            'absolute inset-0 h-full w-full touch-none select-none',
            busy ? 'cursor-wait' : 'cursor-move',
          )}
          aria-hidden="true"
          onPointerDown={event => {
            if (busy) return;
            event.preventDefault();
            const p = point(event);
            if (!p) return;
            const resize = !!(event.target as Element).closest('[data-resize]');
            const inside =
              p.x >= crop.left &&
              p.x <= crop.left + crop.width &&
              p.y >= crop.top &&
              p.y <= crop.top + crop.height;
            const start =
              inside || resize
                ? crop
                : moveImageCrop(
                    crop,
                    dimensions,
                    p.x - crop.left - crop.width / 2,
                    p.y - crop.top - crop.height / 2,
                  );
            onChange(start);
            drag.current = { pointerId: event.pointerId, x: p.x, y: p.y, crop: start, resize };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const start = drag.current;
            if (!start || start.pointerId !== event.pointerId || busy) return;
            const p = point(event);
            if (!p) return;
            onChange(
              start.resize
                ? resizeImageCropFromCorner(
                    start.crop,
                    dimensions,
                    p.x - start.x,
                    p.y - start.y,
                    minimumWidth,
                    minimumHeight,
                  )
                : moveImageCrop(start.crop, dimensions, p.x - start.x, p.y - start.y),
            );
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
        >
          <defs>
            <clipPath id={handleClipId}>
              <path d={handleClipPath || undefined} clipRule="evenodd" />
            </clipPath>
          </defs>
          <path d={shadePath || undefined} fill="black" fillOpacity="0.6" fillRule="evenodd" />
          <rect
            x={crop.left}
            y={crop.top}
            width={crop.width}
            height={crop.height}
            fill="transparent"
            stroke="white"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <g clipPath={smallCrop ? `url(#${handleClipId})` : undefined}>
            <circle
              data-resize="true"
              cx={crop.left + crop.width}
              cy={crop.top + crop.height}
              r={handleRadius}
              fill="white"
              stroke="black"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              className={busy ? 'cursor-wait' : 'cursor-nwse-resize'}
            />
            <circle
              data-resize="true"
              cx={crop.left + crop.width}
              cy={crop.top + crop.height}
              r={handleRadius}
              fill="transparent"
              stroke="transparent"
              strokeWidth="20"
              vectorEffect="non-scaling-stroke"
              className={busy ? 'cursor-wait' : 'cursor-nwse-resize'}
            />
          </g>
        </svg>
      )}
    </div>
  );
}
