import { Button } from '@/components/ui/button.tsx';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion.tsx';
import { PqTournament } from './types';

interface JsonDataViewProps {
  data: PqTournament[];
  onClear: () => void;
}

export function JsonDataView({ data, onClear }: JsonDataViewProps) {
  return (
    <AccordionItem value="saved-data">
      <AccordionTrigger>Parsed PQ Data (JSON)</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[400px]">
            {Array.isArray(data) 
              ? JSON.stringify(data, null, 2)
              : JSON.stringify({error: "Data is not in the expected format"}, null, 2)}
          </pre>
          <Button variant="destructive" onClick={onClear}>
            Clear Saved Data
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
