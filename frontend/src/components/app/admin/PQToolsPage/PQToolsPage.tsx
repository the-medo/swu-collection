import { useState, useEffect } from 'react';
import { Accordion } from '@/components/ui/accordion.tsx';
import { PQTournament, LOCAL_STORAGE_KEY } from './types';
import { PQParserForm } from './PQParserForm.tsx';
import { PQJsonDataView } from './PQJsonDataView.tsx';
import { PQEditableDataView } from './PQEditableDataView.tsx';
import { PQWeekTools } from './PQWeekTools.tsx';

export function PQToolsPage() {
  const [savedData, setSavedData] = useState<PQTournament[] | null>(null);

  // Load data from local storage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        // Ensure parsedData is an array
        if (Array.isArray(parsedData)) {
          setSavedData(parsedData);
        } else {
          console.error('Stored data is not an array:', parsedData);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to parse stored data:', error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }, []);

  const handleDataParsed = (data: any) => {
    // Ensure data is an array before setting it
    if (Array.isArray(data)) {
      setSavedData(data);
    } else {
      console.error('Parsed data is not an array:', data);
      // Don't set invalid data
    }
  };

  const clearSavedData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setSavedData(null);
  };

  // Handle saving changes to a specific tournament entry
  const handleSaveTournament = (index: number, updatedData: PQTournament) => {
    if (!savedData) return;

    // Create a new array with the updated data
    const newData = [...savedData];
    newData[index] = updatedData;

    // Save to local storage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
    setSavedData(newData);
  };

  // Handle removing a tournament entry
  const handleRemoveTournament = (index: number) => {
    if (!savedData) return;

    // Create a new array without the removed data
    const newData = savedData.filter((_, i) => i !== index);

    // Save to local storage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
    setSavedData(newData);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">PQ Parsing Tools</h2>

      <Accordion type="single" collapsible className="w-full">
        <PQParserForm onDataParsed={handleDataParsed} />

        {savedData && (
          <>
            <PQJsonDataView data={savedData} onClear={clearSavedData} />
            <PQEditableDataView
              data={savedData}
              onSave={handleSaveTournament}
              onRemove={handleRemoveTournament}
            />
          </>
        )}
      </Accordion>
      <h2 className="text-2xl font-bold">PQ Week Tools</h2>
      <PQWeekTools />
    </div>
  );
}
