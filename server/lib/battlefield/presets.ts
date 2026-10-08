import { and, arrayContains, count, desc, eq, ilike } from 'drizzle-orm';
import { db } from '../../db';
import { battlefieldPreset } from '../../db/schema/battlefield_preset.ts';
import { cloneBattlefieldScene } from '../../../shared/battlefield/editing.ts';
import {
  battlefieldCost,
  BattlefieldSceneError,
  repairBattlefieldScene,
} from '../../../shared/battlefield/cost.ts';
import { normalizeBattlefieldScene } from '../../../shared/battlefield/normalize.ts';
import {
  battlefieldShowcasePageSize,
  battlefieldShowcaseDefaultFilters,
  type BattlefieldPresetInput,
  type BattlefieldPresetSaveInput,
  type BattlefieldShowcaseFilters,
  type BattlefieldPreset,
  type BattlefieldShowcaseData,
} from '../../../shared/types/battlefield.ts';
import { BattlefieldError, battlefieldCreditBalance, validateBattlefieldScene } from './service.ts';

const columns = {
  id: battlefieldPreset.id,
  name: battlefieldPreset.name,
  scene: battlefieldPreset.scene,
  factions: battlefieldPreset.factions,
  revision: battlefieldPreset.revision,
};
const present = (
  preset: Omit<typeof battlefieldPreset.$inferSelect, 'createdAt'>,
): BattlefieldPreset => {
  let scene = normalizeBattlefieldScene(preset.scene);
  let cost: number;
  try {
    cost = battlefieldCost(scene);
  } catch (error) {
    if (!(error instanceof BattlefieldSceneError)) throw error;
    // Catalog changes repair only the returned layout; the stored source and revision stay intact.
    scene = repairBattlefieldScene(scene);
    cost = battlefieldCost(scene);
  }
  return {
    id: preset.id,
    name: preset.name,
    scene,
    factions: preset.factions,
    revision: preset.revision,
    cost,
  };
};

export const battlefieldPresetService = {
  async list(
    page: number,
    filters: BattlefieldShowcaseFilters = battlefieldShowcaseDefaultFilters,
    userId?: string,
  ): Promise<BattlefieldShowcaseData> {
    const where = and(
      filters.search
        ? ilike(battlefieldPreset.name, '%' + filters.search.replace(/[\\%_]/g, '\\$&') + '%')
        : undefined,
      filters.faction !== 'all'
        ? arrayContains(battlefieldPreset.factions, [filters.faction])
        : undefined,
    );
    if (filters.withinCredits || filters.sort !== 'newest') {
      if (filters.withinCredits && !userId)
        throw new BattlefieldError('Sign in to filter by your credits.', 400);
      const rows = await db
        .select(columns)
        .from(battlefieldPreset)
        .where(where)
        .orderBy(desc(battlefieldPreset.createdAt), desc(battlefieldPreset.id));
      // Costs use the current shared catalog, including hidden objects and size pricing.
      // Filter and sort the matching set before slicing its three-row page.
      const budget = filters.withinCredits
        ? await battlefieldCreditBalance(db, userId!)
        : undefined;
      let presets = rows
        .map(present)
        .filter(preset => budget === undefined || preset.cost <= budget);
      if (filters.sort !== 'newest')
        presets = presets.sort((a, b) =>
          filters.sort === 'price-asc' ? a.cost - b.cost : b.cost - a.cost,
        );
      return {
        presets: presets.slice(
          (page - 1) * battlefieldShowcasePageSize,
          page * battlefieldShowcasePageSize,
        ),
        total: presets.length,
        page,
        pageSize: battlefieldShowcasePageSize,
      };
    }
    const [rows, [total]] = await Promise.all([
      db
        .select(columns)
        .from(battlefieldPreset)
        .where(where)
        .orderBy(desc(battlefieldPreset.createdAt), desc(battlefieldPreset.id))
        .limit(battlefieldShowcasePageSize)
        .offset((page - 1) * battlefieldShowcasePageSize),
      db.select({ value: count() }).from(battlefieldPreset).where(where),
    ]);
    return {
      presets: rows.map(present),
      total: total.value,
      page,
      pageSize: battlefieldShowcasePageSize,
    };
  },
  async get(id: string): Promise<BattlefieldPreset> {
    const [preset] = await db
      .select(columns)
      .from(battlefieldPreset)
      .where(eq(battlefieldPreset.id, id));
    if (!preset) throw new BattlefieldError('Battlefield preset not found.', 404);
    return present(preset);
  },
  async create(input: BattlefieldPresetInput): Promise<BattlefieldPreset> {
    // Publishing a preset does not use the administrator's personal credit budget or slots.
    validateBattlefieldScene(input.scene, Number.MAX_SAFE_INTEGER);
    const [preset] = await db
      .insert(battlefieldPreset)
      .values({
        name: input.name,
        scene: cloneBattlefieldScene(input.scene),
        factions: input.factions ?? [],
      })
      .returning(columns);
    return present(preset);
  },
  async save(id: string, input: BattlefieldPresetSaveInput): Promise<BattlefieldPreset> {
    validateBattlefieldScene(input.scene, Number.MAX_SAFE_INTEGER);
    const [saved] = await db
      .update(battlefieldPreset)
      .set({
        name: input.name,
        scene: input.scene,
        factions: input.factions,
        revision: input.revision + 1,
      })
      .where(and(eq(battlefieldPreset.id, id), eq(battlefieldPreset.revision, input.revision)))
      .returning(columns);
    if (saved) return present(saved);
    const [existing] = await db
      .select({ id: battlefieldPreset.id })
      .from(battlefieldPreset)
      .where(eq(battlefieldPreset.id, id));
    if (!existing) throw new BattlefieldError('Battlefield preset not found.', 404);
    throw new BattlefieldError(
      'This preset changed in another tab or was updated by another administrator. Reload the latest version before saving.',
      409,
    );
  },
  async remove(id: string) {
    const [removed] = await db
      .delete(battlefieldPreset)
      .where(eq(battlefieldPreset.id, id))
      .returning({ id: battlefieldPreset.id });
    if (!removed) throw new BattlefieldError('Battlefield preset not found.', 404);
    return removed;
  },
};
