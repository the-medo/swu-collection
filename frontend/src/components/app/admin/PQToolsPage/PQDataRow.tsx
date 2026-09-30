import { useState } from 'react';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { getPqAdditionalInfo, type PQTournament, type PQDataRowProps } from './types';
import { DatePicker } from '@/components/ui/date-picker.tsx';
import ContinentSelect from '@/components/app/tournaments/components/ContinentSelect.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { PQ_FORMATS, type PQFormat } from './types';
import { AdditionalInfoEditor } from '@/components/app/tournaments/location/AdditionalInfoEditor.tsx';
import {
  infoToRows,
  rowsToInfo,
} from '@/components/app/tournaments/location/additionalInfoRows.ts';

// Component for editing a single PQ tournament entry
export function PQDataRow({ data, index, onSave, onRemove }: PQDataRowProps) {
  const [formData, setFormData] = useState<PQTournament>(data);
  const [isDirty, setIsDirty] = useState(false);
  const [infoRows, setInfoRows] = useState(() => infoToRows(getPqAdditionalInfo(data)));
  const [infoError, setInfoError] = useState('');

  // Handle input changes
  const handleChange = <K extends keyof PQTournament>(field: K, value: PQTournament[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // Handle save button click
  const handleSave = () => {
    try {
      const additionalInfo = rowsToInfo(infoRows);
      onSave(index, {
        ...formData,
        additionalInfo,
        link: typeof additionalInfo.sourceUrl === 'string' ? additionalInfo.sourceUrl : undefined,
      });
      setInfoError('');
      setIsDirty(false);
    } catch (error) {
      setInfoError(error instanceof Error ? error.message : 'Invalid additional info');
    }
  };

  // Handle remove button click
  const handleRemove = () => {
    onRemove(index);
  };

  return (
    <div className="flex flex-wrap gap-2 rounded mb-2">
      <div className="flex-1 min-w-[200px]">
        <Input value={formData.name} onChange={e => handleChange('name', e.target.value)} />
      </div>
      <div className="w-[100px]">
        <Input value={formData.location} onChange={e => handleChange('location', e.target.value)} />
      </div>
      <div className="w-[150px]">
        <ContinentSelect
          value={formData.continent}
          onChange={value => handleChange('continent', value || '')}
        />
      </div>
      <div className="w-[150px]">
        <DatePicker date={formData.date} onDateChange={date => handleChange('date', date || '')} />
      </div>
      <div className="w-[150px]">
        <Select
          value={formData.format}
          onValueChange={value => handleChange('format', value as PQFormat)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            {PQ_FORMATS.map(format => (
              <SelectItem key={format} value={format}>
                {format}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 min-w-[200px]">
        <Input
          aria-label="Tournament source link"
          value={infoRows.find(row => row.key === 'sourceUrl')?.value ?? ''}
          onChange={e => {
            const value = e.target.value;
            setInfoRows(rows => [
              ...rows.filter(row => row.key !== 'sourceUrl'),
              ...(value
                ? [{ id: 'sourceUrl', key: 'sourceUrl', value, mode: 'text' as const }]
                : []),
            ]);
            setIsDirty(true);
          }}
        />
      </div>
      <div className="flex items-end gap-2">
        <Button onClick={handleSave} disabled={!isDirty} size="sm">
          Save
        </Button>
        <Button onClick={handleRemove} variant="destructive" size="sm">
          Remove
        </Button>
      </div>
      <details className="w-full border-b pb-2">
        <summary className="cursor-pointer text-sm">Additional info (address and links)</summary>
        <div className="py-3">
          <AdditionalInfoEditor
            rows={infoRows}
            onChange={rows => {
              setInfoRows(rows);
              setIsDirty(true);
            }}
          />
        </div>
      </details>
      {infoError && (
        <p role="alert" className="text-sm text-destructive">
          {infoError}
        </p>
      )}
    </div>
  );
}
