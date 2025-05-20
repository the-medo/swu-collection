import { createFileRoute } from '@tanstack/react-router';
import DeckFormatConverter from '@/components/app/tools/DeckFormatConverter/DeckFormatConverter.tsx';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/tools/deck-format-converter/')({
  component: DeckFormatConverterRoute,
});

function DeckFormatConverterRoute() {
  return (
    <>
      <Helmet title="Deck Format Converter | SWUBase" />
      <div className="p-4">
        <h2 className="mb-4">Deck Format Converter</h2>
        <DeckFormatConverter />
      </div>
    </>
  );
}
