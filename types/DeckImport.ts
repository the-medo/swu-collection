import { z } from 'zod';
import { formatData } from './Format.ts';

export const deckBuilderSources = [
  'swudb',
  'swuforge',
  'melee',
  'holoscan',
  'protect-the-pod',
] as const;

export const zDeckBuilderSource = z.enum(deckBuilderSources);

export const deckBuilderSourceLabels: Record<z.infer<typeof zDeckBuilderSource>, string> = {
  swudb: 'SWUDB',
  swuforge: 'SWU Forge',
  melee: 'Melee',
  holoscan: 'HoloScan',
  'protect-the-pod': 'Protect the Pod',
};

export const getDeckBuilderDeckLink = (source: DeckBuilderSource, deckId: string) => {
  const encodedDeckId = encodeURIComponent(deckId);
  switch (source) {
    case 'swudb':
      return `https://swudb.com/deck/${encodedDeckId}`;
    case 'swuforge':
      return `https://swuforge.com/decks/${encodedDeckId}`;
    case 'melee':
      return `https://melee.gg/Decklist/View/${encodedDeckId}`;
    case 'holoscan':
      return `https://holoscan.net/decks/${encodedDeckId}`;
    case 'protect-the-pod':
      return `https://www.protectthepod.com/pool/${encodedDeckId}/deck/play`;
  }
};

export const zDeckImportFormat = z
  .number({ error: 'Choose a format before importing a deck.' })
  .int()
  .refine(value => formatData.some(format => format.id === value), {
    message: 'Choose a supported deck format.',
  });

export const zDeckImportRequest = z.object({
  deckLink: z.string().trim().pipe(z.url()),
  format: zDeckImportFormat,
});

export type DeckBuilderSource = z.infer<typeof zDeckBuilderSource>;
export type ZDeckImportRequest = z.infer<typeof zDeckImportRequest>;
