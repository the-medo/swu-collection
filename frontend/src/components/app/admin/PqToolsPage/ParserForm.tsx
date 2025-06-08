import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion.tsx';
import { toast } from '@/hooks/use-toast.ts';
import { useParsePqTournaments } from '@/api/tournaments/useParsePqTournaments.ts';
import { PqTournament, LOCAL_STORAGE_KEY } from './types';

interface ParserFormProps {
  onDataParsed: (data: PqTournament[]) => void;
}

export function ParserForm({ onDataParsed }: ParserFormProps) {
  const [inputData, setInputData] = useState('');
  const [parsedData, setParsedData] = useState<string>('');
  const [hasParsedData, setHasParsedData] = useState(false);
  const parsePqMutation = useParsePqTournaments();

  const handleSubmit = async () => {
    if (!inputData.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter some data to parse',
      });
      return;
    }

    try {
      const result = await parsePqMutation.mutateAsync({ data: inputData });

      if (result.success && result.data.parsedPqData) {
        // Ensure parsedPqData is an array
        setParsedData(JSON.stringify(result.data.parsedPqData, null, 2));
        setHasParsedData(true);

        toast({
          title: 'Success',
          description: 'PQ data parsed successfully. You can now edit it before saving.',
        });
      }
    } catch (error) {
      console.error('Error parsing PQ data:', error);
    }
  };

  const handleSave = () => {
    try {
      // Parse the edited data
      const dataToSave = JSON.parse(parsedData);

      // Ensure it's an array
      if (Array.isArray(dataToSave)) {
        // Save to local storage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
        // Update parent component
        onDataParsed(dataToSave);

        toast({
          title: 'Saved',
          description: 'PQ data saved to local storage',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Edited data is not a valid array',
        });
      }
    } catch (error) {
      console.error('Error saving edited data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Invalid JSON format. Please check your edits.',
      });
    }
  };

  return (
    <AccordionItem value="parser">
      <AccordionTrigger>PQ Tournaments Parser</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <Textarea
            placeholder="Paste PQ tournament data here..."
            className="min-h-[200px]"
            value={inputData}
            onChange={e => setInputData(e.target.value)}
          />
          <Button onClick={handleSubmit} disabled={parsePqMutation.isPending}>
            {parsePqMutation.isPending ? 'Parsing...' : 'Parse Data'}
          </Button>

          {hasParsedData && (
            <div className="space-y-4 mt-6 border-t pt-4">
              <h3 className="text-lg font-medium">Edit Parsed Data</h3>
              <p className="text-sm text-gray-500">
                You can edit the parsed data below before saving it to local storage.
              </p>
              <Textarea
                className="min-h-[300px] font-mono text-sm"
                value={parsedData}
                onChange={e => setParsedData(e.target.value)}
              />
              <Button onClick={handleSave} className="mt-2">
                Save to Local Storage
              </Button>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
