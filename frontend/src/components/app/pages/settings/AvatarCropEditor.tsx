import { useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { cn } from '@/lib/utils.ts';
import { minimumAvatarCropSize, type AvatarCrop } from '../../../../../../types/UserAvatar.ts';

type Dimensions = { width: number; height: number };
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, Math.round(value)));

export function AvatarCropEditor({
  src,
  name,
  pending,
  onSave,
  onCancel,
}: {
  src: string;
  name: string;
  pending: boolean;
  onSave: (crop: AvatarCrop) => void;
  onCancel: () => void;
}) {
  const [dimensions, setDimensions] = useState<Dimensions>();
  const [crop, setCrop] = useState<AvatarCrop>();
  const [failed, setFailed] = useState(false);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    crop: AvatarCrop;
    resize: boolean;
  } | null>(null);

  const point = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * dimensions!.width) / rect.width,
      y: ((e.clientY - rect.top) * dimensions!.height) / rect.height,
    };
  };
  const resize = (size: number) => {
    if (!crop || !dimensions) return;
    setCrop({
      size,
      left: clamp(crop.left + (crop.size - size) / 2, dimensions.width - size),
      top: clamp(crop.top + (crop.size - size) / 2, dimensions.height - size),
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-6">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground" id="avatar-crop-help">
            Drag the square to frame your avatar. Resize from its corner, or use the sliders.
          </p>
          <div className="relative w-full max-w-[360px] overflow-hidden rounded-md bg-muted">
            <img
              src={src}
              alt={name}
              draggable={false}
              className="block h-auto w-full"
              onError={() => {
                setFailed(true);
                setCrop(undefined);
              }}
              onLoad={e => {
                const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
                setDimensions({ width, height });
                if (Math.min(width, height) < minimumAvatarCropSize) {
                  setFailed(true);
                  return;
                }
                const size = Math.max(
                  minimumAvatarCropSize,
                  Math.round(Math.min(width, height) * 0.65),
                );
                setCrop({
                  left: Math.round((width - size) / 2),
                  top: Math.round((height - size) / 3),
                  size,
                });
              }}
            />
            {dimensions && crop && (
              <svg
                className={cn(
                  'absolute inset-0 h-full w-full touch-none select-none',
                  pending ? 'cursor-wait' : 'cursor-crosshair',
                )}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                aria-hidden="true"
                onPointerDown={e => {
                  if (pending) return;
                  e.preventDefault();
                  const { x, y } = point(e);
                  const isResize = (e.target as Element).hasAttribute('data-resize');
                  const inside =
                    x >= crop.left &&
                    x <= crop.left + crop.size &&
                    y >= crop.top &&
                    y <= crop.top + crop.size;
                  const start =
                    inside || isResize
                      ? crop
                      : {
                          ...crop,
                          left: clamp(x - crop.size / 2, dimensions.width - crop.size),
                          top: clamp(y - crop.size / 2, dimensions.height - crop.size),
                        };
                  setCrop(start);
                  drag.current = { pointerId: e.pointerId, x, y, crop: start, resize: isResize };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={e => {
                  const start = drag.current;
                  if (!start || start.pointerId !== e.pointerId || pending) return;
                  const { x, y } = point(e);
                  if (start.resize) {
                    const size = Math.max(
                      minimumAvatarCropSize,
                      Math.min(
                        dimensions.width - start.crop.left,
                        dimensions.height - start.crop.top,
                        Math.round(start.crop.size + Math.max(x - start.x, y - start.y)),
                      ),
                    );
                    setCrop({ ...start.crop, size });
                  } else {
                    setCrop({
                      ...start.crop,
                      left: clamp(
                        start.crop.left + x - start.x,
                        dimensions.width - start.crop.size,
                      ),
                      top: clamp(start.crop.top + y - start.y, dimensions.height - start.crop.size),
                    });
                  }
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
                <path
                  d={`M0 0H${dimensions.width}V${dimensions.height}H0Z M${crop.left} ${crop.top}h${crop.size}v${crop.size}h-${crop.size}Z`}
                  fill="black"
                  fillOpacity="0.6"
                  fillRule="evenodd"
                />
                <rect
                  x={crop.left}
                  y={crop.top}
                  width={crop.size}
                  height={crop.size}
                  fill="transparent"
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-move"
                />
                <circle
                  data-resize="true"
                  cx={crop.left + crop.size}
                  cy={crop.top + crop.size}
                  r="10"
                  fill="white"
                  stroke="black"
                  strokeWidth="1"
                  className="cursor-nwse-resize"
                />
              </svg>
            )}
          </div>
          {failed && (
            <p role="alert" className="text-sm text-destructive">
              This image could not be loaded or is too small. Choose another version.
            </p>
          )}
          {!dimensions && !failed && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading card image…
            </p>
          )}
          {dimensions && crop && (
            <fieldset disabled={pending} className="space-y-3" aria-describedby="avatar-crop-help">
              <div className="space-y-1">
                <Label htmlFor="avatar-crop-size">Square size</Label>
                <input
                  id="avatar-crop-size"
                  type="range"
                  className="block w-full accent-primary"
                  min={minimumAvatarCropSize}
                  max={Math.min(dimensions.width, dimensions.height)}
                  value={crop.size}
                  onChange={e => resize(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="avatar-crop-x">Horizontal position</Label>
                <input
                  id="avatar-crop-x"
                  type="range"
                  className="block w-full accent-primary"
                  min={0}
                  max={dimensions.width - crop.size}
                  value={crop.left}
                  onChange={e => setCrop({ ...crop, left: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="avatar-crop-y">Vertical position</Label>
                <input
                  id="avatar-crop-y"
                  type="range"
                  className="block w-full accent-primary"
                  min={0}
                  max={dimensions.height - crop.size}
                  value={crop.top}
                  onChange={e => setCrop({ ...crop, top: Number(e.target.value) })}
                />
              </div>
            </fieldset>
          )}
        </div>
        {dimensions && crop && (
          <div className="space-y-4">
            <h4 className="font-medium">Preview</h4>
            <p className="text-sm text-muted-foreground">
              Your avatar in square and circle formats.
            </p>
            <div className="flex flex-wrap items-end gap-5">
              {[100, 64, 32].map(size => (
                <div key={size} className="flex flex-col items-center gap-3">
                  {[false, true].map(circle => (
                    <svg
                      key={String(circle)}
                      width={size}
                      height={size}
                      viewBox={`${crop.left} ${crop.top} ${crop.size} ${crop.size}`}
                      className={cn(
                        'overflow-hidden bg-muted ring-1 ring-border',
                        circle && 'rounded-full',
                      )}
                      role="img"
                      aria-label={`${size} pixel ${circle ? 'circle' : 'square'} avatar preview`}
                    >
                      <image href={src} width={dimensions.width} height={dimensions.height} />
                    </svg>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    {size} × {size}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button disabled={!crop || failed || pending} onClick={() => crop && onSave(crop)}>
          {pending ? 'Saving avatar…' : 'Save avatar'}
        </Button>
        <Button variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
