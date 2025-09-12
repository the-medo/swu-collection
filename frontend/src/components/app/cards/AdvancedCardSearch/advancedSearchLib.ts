import { z } from 'zod';
import { SwuArena, SwuAspect, SwuRarity, SwuSet } from '../../../../../../types/enums.ts';

export const cardSearchParams = z.object({
  // Text search
  name: z.string().optional(),
  text: z.string().optional(),

  // Set and Rarity filters
  sets: z.array(z.enum(Object.values(SwuSet) as [string, ...string[]])).optional(),
  rarities: z.array(z.enum(Object.values(SwuRarity) as [string, ...string[]])).optional(),

  // Type filters
  cardTypes: z.array(z.string()).optional(),

  // Attribute filters
  aspects: z.array(z.enum(Object.values(SwuAspect) as [string, ...string[]])).optional(),
  aspectsExact: z.boolean().optional(),
  arenas: z.array(z.enum(Object.values(SwuArena) as [string, ...string[]])).optional(),
  traits: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  variants: z.array(z.string()).optional(),

  // Numeric filters - represent as min-max strings that will be parsed
  cost: z.string().optional(), // format: "min-max" e.g. "2-5"
  power: z.string().optional(),
  hp: z.string().optional(),
  upgradePower: z.string().optional(),
  upgradeHp: z.string().optional(),

  // UI state
  resultsLayout: z
    .enum(['imageBig', 'imageMedium', 'imageSmall', 'tableImage', 'tableSmall'])
    .optional(),
  sort: z.enum(['name', 'cardNumber', 'cost', 'type', 'rarity']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
