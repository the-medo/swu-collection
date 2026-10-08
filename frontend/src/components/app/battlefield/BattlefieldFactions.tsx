import {
  battlefieldFactionIds,
  battlefieldFactionNames,
  type BattlefieldFaction,
} from '../../../../../shared/types/battlefield.ts';

export function BattlefieldFactions({
  value,
  onChange,
  disabled = false,
}: {
  value: BattlefieldFaction[];
  onChange: (value: BattlefieldFaction[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">Preset factions</legend>
      <div className="flex flex-wrap gap-2">
        {battlefieldFactionIds.map(id => (
          <label
            key={id}
            className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs"
          >
            <input
              type="checkbox"
              className="accent-primary"
              checked={value.includes(id)}
              onChange={event =>
                onChange(
                  event.target.checked ? [...value, id] : value.filter(faction => faction !== id),
                )
              }
            />
            {battlefieldFactionNames[id]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
