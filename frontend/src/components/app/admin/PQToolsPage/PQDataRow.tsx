import { useState } from 'react';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { PQTournament, PQDataRowProps } from './types';
import { DatePicker } from '@/components/ui/date-picker.tsx';
import ContinentSelect from '@/components/app/tournaments/components/ContinentSelect.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { PQ_FORMATS, type PQFormat } from './types';

// Component for editing a single PQ tournament entry
export function PQDataRow({ data, index, onSave, onRemove }: PQDataRowProps) {
  const [formData, setFormData] = useState<PQTournament>(data);
  const [isDirty, setIsDirty] = useState(false);

  // Handle input changes
  const handleChange = <K extends keyof PQTournament>(field: K, value: PQTournament[K]) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      setIsDirty(true);
      return newData;
    });
  };

  // Handle save button click
  const handleSave = () => {
    onSave(index, formData);
    setIsDirty(false);
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
        <Input value={formData.link || ''} onChange={e => handleChange('link', e.target.value)} />
      </div>
      <div className="flex items-end gap-2">
        <Button onClick={handleSave} disabled={!isDirty} size="sm">
          Save
        </Button>
        <Button onClick={handleRemove} variant="destructive" size="sm">
          Remove
        </Button>
      </div>
    </div>
  );
}
