import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Plus, Trash2 } from 'lucide-react';
import type { InfoRow } from './additionalInfoRows.ts';

export function AdditionalInfoEditor({
  rows,
  onChange,
  disabled = false,
}: {
  rows: InfoRow[];
  onChange: (rows: InfoRow[]) => void;
  disabled?: boolean;
}) {
  const update = (id: string, patch: Partial<InfoRow>) =>
    onChange(rows.map(row => (row.id === id ? { ...row, ...patch } : row)));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Use address, city, state and postalCode for geocoding. The country comes from the
        tournament. Other fields can include venueName, storeUrl, meleeUrl or links. This data is
        public. Select JSON for numbers, booleans, lists or objects.
      </p>
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(100px,1fr)_100px_minmax(0,2fr)_auto] gap-2 items-start"
        >
          <Input
            aria-label={`Key ${index + 1}`}
            placeholder="Key"
            disabled={disabled}
            value={row.key}
            onChange={e => update(row.id, { key: e.target.value })}
          />
          <Select
            disabled={disabled}
            value={row.mode}
            onValueChange={mode => update(row.id, { mode: mode as InfoRow['mode'] })}
          >
            <SelectTrigger aria-label={`Value type ${index + 1}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            aria-label={`Value ${index + 1}`}
            placeholder="Value"
            disabled={disabled}
            rows={row.mode === 'json' ? 3 : 1}
            value={row.value}
            onChange={e => update(row.id, { value: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${row.key || 'field'}`}
            disabled={disabled}
            onClick={() => onChange(rows.filter(item => item.id !== row.id))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            onChange([...rows, { id: crypto.randomUUID(), key: '', value: '', mode: 'text' }])
          }
        >
          <Plus className="size-4" />
          Add field
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            onChange([
              ...rows,
              ...['address', 'city', 'state', 'postalCode']
                .filter(key => !rows.some(row => row.key === key))
                .map(key => ({ id: crypto.randomUUID(), key, value: '', mode: 'text' as const })),
            ])
          }
        >
          Add address fields
        </Button>
      </div>
    </div>
  );
}
