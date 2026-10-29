import { z } from 'zod';
import { discoverySchema } from '../../../../../shared/creators/contracts.ts';
import { creatorReturnToSchema } from './creatorNavigationSearch.ts';

export const creatorTabSchema = z.enum([
  'videos',
  'articles',
  'podcasts',
  'decks',
  'series',
  'about',
]);
export type CreatorTab = 'all' | z.infer<typeof creatorTabSchema>;
export const creatorPageSearchSchema = z.object({
  returnTo: creatorReturnToSchema,
  language: discoverySchema.shape.language.catch(undefined),
  tags: discoverySchema.shape.tags.catch(undefined),
  series: discoverySchema.shape.series.catch(undefined),
  q: discoverySchema.shape.q.catch(undefined),
});
export type CreatorPageSearch = z.infer<typeof creatorPageSearchSchema>;
export const creatorTabs: { value: CreatorTab; label: string }[] = [
  { value: 'all', label: 'All content' },
  { value: 'videos', label: 'Videos' },
  { value: 'articles', label: 'Articles' },
  { value: 'podcasts', label: 'Podcasts' },
  { value: 'decks', label: 'Decks' },
  { value: 'series', label: 'Series' },
  { value: 'about', label: 'About' },
];
