import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { ImageCropCanvas } from './ImageCropCanvas.tsx';
import {
  clampCropPosition as clamp,
  type ImageDimensions as Dimensions,
} from './imageCropGeometry.ts';
import {
  headerCropSchema,
  idealHeaderImageWidth,
  getMaximumHeaderCropHeight,
  minimumHeaderCropWidth,
  type HeaderCrop,
} from '../../../../../types/UserHeader.ts';
import { recommendedHeaderImageWidth } from '../../../../../types/ImageGallery.ts';

function limitCropHeight(crop: HeaderCrop): HeaderCrop {
  const height = Math.min(crop.height, getMaximumHeaderCropHeight(crop.width));
  if (height === crop.height) return crop;
  return { ...crop, height, top: crop.top + Math.floor((crop.height - height) / 2) };
}

export function HeaderCropEditor({
  src,
  name,
  initialCrop,
  busy,
  onSave,
  onCancel,
}: {
  src: string;
  name: string;
  initialCrop?: HeaderCrop | null;
  busy: boolean;
  onSave(crop: HeaderCrop): void;
  onCancel(): void;
}) {
  const [dimensions, setDimensions] = useState<Dimensions>();
  const [cropState, setCrop] = useState<HeaderCrop>();
  const crop = cropState && limitCropHeight(cropState);
  const [failed, setFailed] = useState(false);
  const resize = (field: 'width' | 'height', value: number) => {
    if (!crop || !dimensions) return;
    const next = { ...crop, [field]: value };
    next.height = Math.min(next.height, dimensions.height, getMaximumHeaderCropHeight(next.width));
    setCrop({
      ...next,
      left: clamp(crop.left + (crop.width - next.width) / 2, dimensions.width - next.width),
      top: clamp(crop.top + (crop.height - next.height) / 2, dimensions.height - next.height),
    });
  };
  return (
    <div className="space-y-4">
      <p id="header-crop-help" className="text-sm text-muted-foreground">
        Drag the rectangle to frame your header. Resize from its corner, or use the sliders. 1600
        pixels is the suggested width; smaller images are welcome. Height can be up to one quarter
        of the crop width, so the ratio is always at least 4:1.
      </p>
      <ImageCropCanvas
        src={src}
        name={name}
        dimensions={dimensions}
        crop={crop}
        busy={busy}
        minimumWidth={minimumHeaderCropWidth}
        minimumHeight={1}
        className="mx-auto w-full max-w-3xl"
        imageClassName="max-h-[500px]"
        onChange={setCrop}
        onError={() => {
          setFailed(true);
          setCrop(undefined);
        }}
        onLoad={({ width, height }) => {
          setDimensions({ width, height });
          if (width < minimumHeaderCropWidth) {
            setFailed(true);
            setCrop(undefined);
            return;
          }
          setFailed(false);
          // Keep the center when an older saved selection is too tall for the ratio.
          const parsed = headerCropSchema.safeParse(initialCrop && limitCropHeight(initialCrop));
          const saved =
            parsed.success &&
            parsed.data.left + parsed.data.width <= width &&
            parsed.data.top + parsed.data.height <= height
              ? parsed.data
              : null;
          const cropWidth = Math.min(idealHeaderImageWidth, width);
          const cropHeight = Math.min(getMaximumHeaderCropHeight(cropWidth), height);
          setCrop(
            saved ?? {
              width: cropWidth,
              height: cropHeight,
              left: Math.round((width - cropWidth) / 2),
              top: Math.round((height - cropHeight) / 3),
            },
          );
        }}
      />
      {crop && !failed && crop.width < recommendedHeaderImageWidth && (
        <p
          role="status"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"
        >
          Low-resolution header. Crops below 1500 pixels wide may look blurry on larger screens. You
          can still use this image.
        </p>
      )}
      {!dimensions && !failed && (
        <p role="status" className="text-sm">
          Loading image…
        </p>
      )}
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          This image could not be loaded or is too narrow for a 4:1 crop. Choose another image.
        </p>
      )}
      {dimensions && crop && (
        <>
          <fieldset
            disabled={busy}
            aria-describedby="header-crop-help"
            className="grid gap-4 @md:grid-cols-2"
          >
            {(
              [
                ['width', 'Width', minimumHeaderCropWidth, dimensions.width],
                [
                  'height',
                  'Height',
                  1,
                  Math.min(getMaximumHeaderCropHeight(crop.width), dimensions.height),
                ],
                ['left', 'Horizontal position', 0, dimensions.width - crop.width],
                ['top', 'Vertical position', 0, dimensions.height - crop.height],
              ] as const
            ).map(([field, label, min, max]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`header-crop-${field}`}>
                  {label}: {crop[field]} px
                </Label>
                <input
                  // Changing a range limit can clamp its value before React tracks the change.
                  key={max}
                  id={`header-crop-${field}`}
                  type="range"
                  className="block w-full accent-primary"
                  min={min}
                  max={max}
                  value={crop[field]}
                  onChange={event => {
                    const value = Number(event.target.value);
                    if (field === 'width' || field === 'height') resize(field, value);
                    else setCrop({ ...crop, [field]: value });
                  }}
                />
              </div>
            ))}
          </fieldset>
          <div className="space-y-2">
            <h4 className="font-medium">Header preview</h4>
            <svg
              viewBox={`${crop.left} ${crop.top} ${crop.width} ${crop.height}`}
              className="block w-full overflow-hidden rounded-lg border bg-muted"
              role="img"
              aria-label="Cropped header preview"
            >
              <image href={src} width={dimensions.width} height={dimensions.height} />
            </svg>
            <p className="text-xs text-muted-foreground">
              {crop.width} × {crop.height} pixels. The saved crop scales to fit the header.
            </p>
          </div>
        </>
      )}
      <div className="flex gap-2">
        <Button disabled={busy || !crop || failed} onClick={() => crop && onSave(crop)}>
          {busy ? 'Saving header…' : 'Save header'}
        </Button>
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
