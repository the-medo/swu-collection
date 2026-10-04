import { useId } from 'react';
import type { CardSize } from './model.ts';

export function CardSizeSelect({
  value,
  onChange,
}: {
  value: CardSize;
  onChange: (size: CardSize) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1 text-sm">
      <label htmlFor={id}>Card size</label>
      <select
        id={id}
        className="h-9 rounded-md border bg-background px-3"
        value={value}
        onChange={e => onChange(e.target.value as CardSize)}
      >
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </select>
    </div>
  );
}
