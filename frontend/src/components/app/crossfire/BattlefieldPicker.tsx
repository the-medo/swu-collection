import { useId } from 'react';
import type { Battlefield } from '../../../../../shared/types/battlefield.ts';
import { BattlefieldCanvas } from '@/components/app/battlefield/BattlefieldCanvas.tsx';

export function BattlefieldPicker({
  battlefields,
  value,
  onChange,
  disabled,
}: {
  battlefields: Battlefield[];
  value?: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const id = useId();
  if (battlefields.length < 2) return null;
  const selected = battlefields.find(b => b.id === value);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        Your battlefield
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
      >
        {battlefields.map(b => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      {selected && (
        <BattlefieldCanvas
          scene={selected.scene}
          decorative
          className="aspect-[4/1] w-full overflow-hidden rounded-lg border"
        />
      )}
      <p className="text-xs text-muted-foreground">
        Your background across both arenas for this match.
      </p>
    </div>
  );
}
