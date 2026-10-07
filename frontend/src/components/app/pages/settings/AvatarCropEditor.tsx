import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { cn } from '@/lib/utils.ts';
import { minimumAvatarCropSize, type AvatarCrop } from '../../../../../../types/UserAvatar.ts';

import { ImageCropCanvas } from '@/components/app/global/ImageCropCanvas.tsx';
import {
  clampCropPosition as clamp,
  type ImageDimensions as Dimensions,
} from '@/components/app/global/imageCropGeometry.ts';

export function AvatarCropEditor({
  src,
  name,
  pending,
  disabled = false,
  onSave,
  onCancel,
}: {
  src: string;
  name: string;
  pending: boolean;
  disabled?: boolean;
  onSave: (crop: AvatarCrop) => void;
  onCancel: () => void;
}) {
  const busy = pending || disabled;
  const [dimensions, setDimensions] = useState<Dimensions>();
  const [crop, setCrop] = useState<AvatarCrop>();
  const [failed, setFailed] = useState(false);
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
      <div className="grid gap-6 @min-[640px]:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground" id="avatar-crop-help">
            Drag the square to frame your avatar. Resize from its corner, or use the sliders.
          </p>
          <ImageCropCanvas
            src={src}
            name={name}
            dimensions={dimensions}
            crop={crop && { left: crop.left, top: crop.top, width: crop.size, height: crop.size }}
            busy={busy}
            minimumWidth={minimumAvatarCropSize}
            minimumHeight={minimumAvatarCropSize}
            className="w-full max-w-[360px]"
            onChange={next => setCrop({ left: next.left, top: next.top, size: next.width })}
            onError={() => {
              setFailed(true);
              setCrop(undefined);
            }}
            onLoad={({ width, height }) => {
              setDimensions({ width, height });
              if (Math.min(width, height) < minimumAvatarCropSize) {
                setFailed(true);
                setCrop(undefined);
                return;
              }
              setFailed(false);
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
          {failed && (
            <p role="alert" className="text-sm text-destructive">
              This image could not be loaded or is smaller than 100 × 100 pixels. Choose another
              image.
            </p>
          )}
          {!dimensions && !failed && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading image…
            </p>
          )}
          {dimensions && crop && (
            <fieldset disabled={busy} className="space-y-3" aria-describedby="avatar-crop-help">
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
                  key={dimensions.width - crop.size}
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
                  key={dimensions.height - crop.size}
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
        <Button disabled={!crop || failed || busy} onClick={() => crop && onSave(crop)}>
          {pending ? 'Saving avatar…' : 'Save avatar'}
        </Button>
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
