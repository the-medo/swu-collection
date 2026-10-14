import { useId } from 'react';
import { Switch } from '@/components/ui/switch.tsx';
import { Label } from '@/components/ui/label.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';

function DisplayToggle({
  setting,
  label,
}: {
  setting: 'cardGalleryShowLabels' | 'cardGalleryShowPrices';
  label: string;
}) {
  const id = useId();
  const preference = useGetUserSetting(setting);
  const save = useSetUserSetting(setting);

  return (
    <div className="flex max-w-sm flex-col items-end gap-2">
      <div className="flex min-h-9 items-center gap-2">
        <Switch
          id={id}
          checked={preference.data ?? false}
          disabled={preference.isPending}
          aria-busy={save.isPending}
          onCheckedChange={checked => {
            if (!save.isPending) save.mutate(checked);
          }}
        />
        <Label
          htmlFor={id}
          className="cursor-pointer whitespace-nowrap text-sm text-muted-foreground"
        >
          {label}
        </Label>
      </div>
      {(save.isError || preference.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Unable to save or load your display preference. Please try again.
        </p>
      )}
    </div>
  );
}

export default function CardGalleryDisplaySettings() {
  return (
    <div className="flex max-w-full flex-wrap items-start justify-end gap-x-5 gap-y-2">
      <DisplayToggle setting="cardGalleryShowLabels" label="Show card labels" />
      <DisplayToggle setting="cardGalleryShowPrices" label="Show prices" />
    </div>
  );
}
