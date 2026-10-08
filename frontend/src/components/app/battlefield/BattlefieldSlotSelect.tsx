import type { BattlefieldEditorData } from '../../../../../shared/types/battlefield.ts';

export function BattlefieldSlotSelect({
  data,
  value,
  onChange,
  disabled,
  label = 'Save to slot',
  ariaLabel = label,
  placeholder = 'Choose a slot…',
}: {
  data: BattlefieldEditorData;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      {label}
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        className="h-9 max-w-56 min-w-0 rounded-md border bg-background px-2 text-sm text-foreground"
      >
        <option value="">{placeholder}</option>
        {data.battlefields.map((battlefield, index) => (
          <option key={battlefield.id} value={battlefield.id}>
            Slot {index + 1}: {battlefield.name}
            {battlefield.active ? ' · on profile' : ''}
          </option>
        ))}
        {data.battlefields.length < data.limit && (
          <option value="new">
            New slot ({data.battlefields.length + 1} / {data.limit})
          </option>
        )}
      </select>
    </label>
  );
}
