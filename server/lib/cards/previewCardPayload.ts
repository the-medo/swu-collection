import { z } from 'zod';
import { SwuArena, SwuAspect, SwuRarity, SwuSet } from '../../../types/enums.ts';
import { setInfo } from '../../../lib/swu-resources/set-info.ts';
import { transformToId } from '../../../lib/swu-resources/lib/transformToId.ts';
import type { CardDataWithVariants, CardListVariants } from '../../../lib/swu-resources/types.ts';

export const previewCardStatusValues = ['active', 'migrated', 'archived'] as const;
export type PreviewCardStatus = (typeof previewCardStatusValues)[number];
export const zPreviewCardStatus = z.enum(previewCardStatusValues);

const zNullableInteger = z.number().int().nullable();
const zOptionalBooleanMap = z.record(z.string(), z.boolean()).optional();
const zAspectMap = z.record(z.enum(SwuAspect), z.number().int().optional()).optional();
const zArenaMap = z.record(z.enum(SwuArena), z.boolean()).optional();
const zVariantMap = z.record(z.string(), z.string().optional()).optional();

export const zPreviewCardVariant = z
  .object({
    variantId: z.string().min(1),
    swuId: z.number().int().nonnegative(),
    set: z.enum(SwuSet),
    fullSetName: z.string().min(1),
    // 0 is allowed for early previews where the card number is unreadable; callers that
    // index by set/cardNo should treat it as "number unknown".
    cardNo: z.number().int().nonnegative(),
    baseSet: z.boolean(),
    hasNonfoil: z.boolean(),
    hasFoil: z.boolean(),
    variantName: z.string().min(1),
    artist: z.string(),
    image: z.object({
      front: z.string().min(1),
      back: z.string().nullable(),
    }),
    front: z
      .object({
        horizontal: z.boolean().optional(),
      })
      .optional(),
    back: z
      .object({
        horizontal: z.boolean().optional(),
      })
      .optional(),
    preview: z.boolean().optional(),
  })
  .passthrough();

export const zPreviewCardPayload = z
  .object({
    cardId: z.string(),
    cardUid: z.array(z.string()).default([]),
    updatedAt: z.string(),
    variants: z.record(z.string(), zPreviewCardVariant),
    title: z.string(),
    subtitle: z.string().optional(),
    name: z.string(),
    hp: zNullableInteger,
    power: zNullableInteger,
    upgradeHp: zNullableInteger,
    upgradePower: zNullableInteger,
    text: z.string().nullable(),
    rules: z.string().nullable(),
    deployBox: z.string().nullable(),
    epicAction: z.string().nullable(),
    front: z.object({
      horizontal: z.boolean().optional(),
    }),
    back: z
      .object({
        horizontal: z.boolean().optional(),
        type: z.string().min(1),
      })
      .nullable(),
    aspects: z.array(z.enum(SwuAspect)),
    type: z.string().min(1),
    cost: zNullableInteger,
    traits: z.array(z.string()),
    keywords: z.array(z.string()),
    arenas: z.array(z.enum(SwuArena)),
    rarity: z.enum(SwuRarity),
    set: z.enum(SwuSet),
    aspectMap: zAspectMap,
    arenaMap: zArenaMap,
    traitMap: zOptionalBooleanMap,
    keywordMap: zOptionalBooleanMap,
    variantMap: zVariantMap,
    preview: z.literal(true).default(true),
    previewStatus: z.literal('active').default('active'),
    // Intentionally snake_case because Karabast preview metadata uses this field name.
    karabast_id: z.string().optional(),
    karabast_id_to_swubase_id: z.string().optional(),
  })
  .passthrough()
  .superRefine((payload, ctx) => {
    if (!payload.cardId.trim() && !payload.name.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['cardId'],
        message: 'At least one of cardId or name must be provided',
      });
    }

    if (!setInfo[payload.set]) {
      ctx.addIssue({
        code: 'custom',
        path: ['set'],
        message: `Unknown SWU set: ${payload.set}`,
      });
    }

    const variants = Object.entries(payload.variants);
    if (variants.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['variants'],
        message: 'Preview cards need at least one variant',
      });
    }

    variants.forEach(([variantKey, variant]) => {
      if (!setInfo[variant.set]) {
        ctx.addIssue({
          code: 'custom',
          path: ['variants', variantKey, 'set'],
          message: `Unknown SWU set: ${variant.set}`,
        });
      }

      if (variant.variantId !== variantKey) {
        ctx.addIssue({
          code: 'custom',
          path: ['variants', variantKey, 'variantId'],
          message: 'Variant key must match variantId',
        });
      }
    });
  });

export type PreviewCardPayload = CardDataWithVariants<CardListVariants> & {
  preview: true;
  previewStatus: 'active';
  karabast_id?: string;
  karabast_id_to_swubase_id?: string;
};

export function createPreviewCardPayloadTemplate(): PreviewCardPayload {
  const variantId = 'example-card-preview-standard';

  return {
    cardId: '',
    cardUid: [],
    updatedAt: '',
    title: '',
    subtitle: '',
    name: '',
    hp: null,
    power: null,
    upgradeHp: null,
    upgradePower: null,
    text: null,
    rules: null,
    deployBox: null,
    epicAction: null,
    front: {
      horizontal: false,
    },
    back: null,
    aspects: [],
    type: 'Unit',
    cost: null,
    traits: [],
    keywords: [],
    arenas: [SwuArena.GROUND],
    rarity: SwuRarity.COMMON,
    set: SwuSet.ASH,
    preview: true,
    previewStatus: 'active',
    karabast_id: '',
    karabast_id_to_swubase_id: '',
    variants: {
      [variantId]: {
        variantId,
        swuId: 0,
        set: SwuSet.ASH,
        fullSetName: 'Ashes of the Empire',
        cardNo: 0,
        baseSet: true,
        hasNonfoil: true,
        hasFoil: false,
        variantName: 'Standard',
        artist: '',
        preview: true,
        image: {
          front: 'preview/example-card-front.webp',
          back: null,
        },
        front: {
          horizontal: false,
        },
      },
    },
  };
}

export function normalizePreviewCardPayload(payload: unknown): PreviewCardPayload {
  const parsed = zPreviewCardPayload.parse(payload);
  const cardId = parsed.cardId.trim() || transformToId(parsed.name);
  const updatedAt = parsed.updatedAt.trim() || new Date().toISOString();
  const variants = Object.fromEntries(
    Object.entries(parsed.variants).map(([variantId, variant]) => [
      variantId,
      { ...variant, preview: true },
    ]),
  ) as CardListVariants;

  // The runtime schema mirrors the shared CardDataWithVariants shape, while passthrough keeps
  // future official card fields from being stripped before the shared type catches up.
  return {
    ...parsed,
    cardId,
    cardUid: parsed.cardUid,
    updatedAt,
    variants,
    preview: true,
    previewStatus: 'active',
  } as PreviewCardPayload;
}
