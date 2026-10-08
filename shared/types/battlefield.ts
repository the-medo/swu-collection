import { z } from 'zod';
import { battlefieldPlanetTextureIds } from '../battlefield/planets.ts';
import { battlefieldMaximumObjectScale } from '../battlefield/catalog.ts';
import { booleanPreprocessor } from '../lib/zod/booleanPreprocessor.ts';
export const battlefieldWidth = 1600;
export const battlefieldHeight = 400;
export const battlefieldObjectLimit = 800;
export const battlefieldLayerLimit = 256;
export const battlefieldDefaultLayerId = '00000000-0000-4000-8000-000000000001';
export const battlefieldDefaultLight = { x: 200, y: 60 };
export const battlefieldLightSchema = z
  .object({
    x: z.number().min(0).max(battlefieldWidth),
    y: z.number().min(0).max(battlefieldHeight),
  })
  .strict();
const itemId = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .max(80);
export const battlefieldLayerSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(80),
    visible: z.boolean(),
    parentId: z.uuid().nullable(),
    order: z
      .number()
      .int()
      .min(0)
      .max(battlefieldObjectLimit + battlefieldLayerLimit),
  })
  .strict();
export const battlefieldPlacementSchema = z
  .object({
    id: z.uuid(),
    itemId,
    x: z.number().min(0).max(battlefieldWidth),
    y: z.number().min(0).max(battlefieldHeight),
    rotation: z.number().min(0).max(360),
    // The shared cost validator enforces the smaller per-object limits on saves.
    scale: z.number().min(0.2).max(battlefieldMaximumObjectScale),
    colorId: itemId,
    textureId: z.enum(battlefieldPlanetTextureIds).optional(),
    layerId: z.uuid(),
    visible: z.boolean(),
    order: z
      .number()
      .int()
      .min(0)
      .max(battlefieldObjectLimit + battlefieldLayerLimit),
  })
  .strict();
export const battlefieldSceneSchema = z
  .object({
    width: z.literal(battlefieldWidth),
    height: z.literal(battlefieldHeight),
    backgroundId: itemId,
    light: battlefieldLightSchema.default(() => ({ ...battlefieldDefaultLight })),
    // Both layers and the objects within each layer are ordered back to front.
    layers: z.array(battlefieldLayerSchema).min(1).max(battlefieldLayerLimit),
    placements: z.array(battlefieldPlacementSchema).max(battlefieldObjectLimit),
  })
  .strict();
export const battlefieldCreateSchema = z
  .object({ name: z.string().trim().min(1).max(80) })
  .strict();
export const battlefieldDraftSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    scene: battlefieldSceneSchema,
  })
  .strict();
export const battlefieldShowcasePageSize = 3;
export const battlefieldFactionIds = [
  'rebel',
  'imperial',
  'republic',
  'separatist',
  'resistance',
  'first-order',
  'mandalorian',
  'independent',
] as const;
export type BattlefieldFaction = (typeof battlefieldFactionIds)[number];
export const battlefieldFactionNames: Record<BattlefieldFaction, string> = {
  rebel: 'Rebel Alliance',
  imperial: 'Galactic Empire',
  republic: 'Galactic Republic',
  separatist: 'Separatist Alliance',
  resistance: 'Resistance',
  'first-order': 'First Order',
  mandalorian: 'Mandalorians',
  independent: 'Independent',
};
export const battlefieldFactionsSchema = z
  .array(z.enum(battlefieldFactionIds))
  .max(battlefieldFactionIds.length)
  .refine(ids => new Set(ids).size === ids.length, 'Choose each faction only once.')
  .default([]);
export const battlefieldPresetCreateSchema = battlefieldDraftSchema.extend({
  factions: battlefieldFactionsSchema,
});
export const battlefieldPresetSaveSchema = battlefieldPresetCreateSchema.extend({
  revision: z.number().int().min(0).max(2147483646),
});
export const battlefieldShowcaseSortSchema = z.enum(['newest', 'price-asc', 'price-desc']);
export const battlefieldShowcaseFactionSchema = z.enum(['all', ...battlefieldFactionIds]);
export const battlefieldShowcaseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  search: z.string().trim().max(80).default(''),
  faction: battlefieldShowcaseFactionSchema.default('all'),
  withinCredits: booleanPreprocessor.default(false),
  sort: battlefieldShowcaseSortSchema.default('newest'),
});
export type BattlefieldShowcaseQuery = z.infer<typeof battlefieldShowcaseQuerySchema>;
export type BattlefieldShowcaseFilters = Omit<BattlefieldShowcaseQuery, 'page'>;
export const battlefieldShowcaseDefaultFilters: BattlefieldShowcaseFilters = {
  search: '',
  faction: 'all',
  withinCredits: false,
  sort: 'newest',
};
export const battlefieldSaveSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    revision: z.number().int().min(0).max(2147483646),
    scene: battlefieldSceneSchema,
  })
  .strict();
export type BattlefieldLayer = z.infer<typeof battlefieldLayerSchema>;
export type BattlefieldLight = z.infer<typeof battlefieldLightSchema>;
export type BattlefieldPlacement = z.infer<typeof battlefieldPlacementSchema>;
export type BattlefieldScene = z.infer<typeof battlefieldSceneSchema>;
export type BattlefieldSaveInput = z.infer<typeof battlefieldSaveSchema>;
export type BattlefieldDraftInput = z.infer<typeof battlefieldDraftSchema>;
export type BattlefieldPresetInput = BattlefieldDraftInput & { factions?: BattlefieldFaction[] };
export type BattlefieldPresetSaveInput = z.infer<typeof battlefieldPresetSaveSchema>;
export type BattlefieldPreset = {
  id: string;
  name: string;
  scene: BattlefieldScene;
  cost: number;
  factions: BattlefieldFaction[];
  revision: number;
};
export type BattlefieldShowcaseData = {
  presets: BattlefieldPreset[];
  total: number;
  page: number;
  pageSize: number;
};
// Read compatibility only. Saves always use the current, strict scene contract.
export type LegacyBattlefieldPlacement = Omit<
  BattlefieldPlacement,
  'layerId' | 'visible' | 'order'
> & {
  addonIds: string[];
  groupId: string | null;
};
export type LegacyBattlefieldScene = Omit<BattlefieldScene, 'placements' | 'layers' | 'light'> & {
  light?: BattlefieldLight;
  placements: LegacyBattlefieldPlacement[];
};
export type FlatBattlefieldScene = Omit<BattlefieldScene, 'layers' | 'placements' | 'light'> & {
  light?: BattlefieldLight;
  layers: (Omit<BattlefieldLayer, 'parentId' | 'order'> &
    Partial<Pick<BattlefieldLayer, 'parentId' | 'order'>>)[];
  placements: (Omit<BattlefieldPlacement, 'order'> & { order?: number })[];
};
export type Battlefield = {
  id: string;
  name: string;
  scene: BattlefieldScene;
  revision: number;
  active: boolean;
};
export type BattlefieldEditorData = { battlefields: Battlefield[]; balance: number; limit: number };
export type PublicBattlefield = { scene: BattlefieldScene };

export function defaultBattlefieldScene(id?: string): BattlefieldScene {
  return {
    width: battlefieldWidth,
    height: battlefieldHeight,
    backgroundId: 'background-default',
    light: { ...battlefieldDefaultLight },
    layers: [
      { id: battlefieldDefaultLayerId, name: 'Scene', visible: true, parentId: null, order: 0 },
    ],
    placements: id
      ? [
          {
            id,
            itemId: 'planet',
            x: 1280,
            y: 400,
            rotation: 330,
            scale: 1.9,
            colorId: 'color-default',
            textureId: 'rocky',
            layerId: battlefieldDefaultLayerId,
            visible: true,
            order: 0,
          },
        ]
      : [],
  };
}
