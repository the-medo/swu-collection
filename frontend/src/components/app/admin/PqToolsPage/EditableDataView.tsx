import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion.tsx';
import { PqTournament } from './types';
import { PqDataRow } from './PqDataRow';

interface EditableDataViewProps {
  data: PqTournament[];
  onSave: (index: number, data: PqTournament) => void;
}

export function EditableDataView({ data, onSave }: EditableDataViewProps) {
  return (
    <AccordionItem value="editable-data">
      <AccordionTrigger>Parsed PQ Data (Editable Form)</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Edit Tournament Entries</h3>
            <p className="text-sm text-gray-500 mb-4">
              Edit the tournament entries below. Click "Save" to save your changes.
            </p>

            <div className="space-y-2">
              {Array.isArray(data) ? (
                data.map((tournament, index) => (
                  <PqDataRow key={index} data={tournament} index={index} onSave={onSave} />
                ))
              ) : (
                <p>No valid data to display</p>
              )}
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
