import { createFileRoute } from '@tanstack/react-router';
import DeckFormatConverter from '@/components/app/tools/DeckFormatConverter/DeckFormatConverter.tsx';

export const Route = createFileRoute('/tools/deck-format-converter/')({
  component: DeckFormatConverterRoute,
});

function DeckFormatConverterRoute() {
  return (
    <div className="p-4">
      <h2 className="mb-4">Deck Format Converter</h2>
      <DeckFormatConverter />
    </div>
  );
}
