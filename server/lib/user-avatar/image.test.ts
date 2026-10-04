import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';
import { cardList } from '../../db/lists.ts';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import { userAvatarInputSchema } from '../../../types/UserAvatar.ts';
import { cropAvatar, resolveAvatarImage } from './image.ts';

const card = Object.values(cardList).find(
  c => c && Object.values(c.variants).some(v => v?.image.back),
)!;
const variant = Object.values(card.variants).find(v => v?.image.back)!;
const input = {
  cardId: card.cardId,
  variantId: variant.variantId,
  side: 'front' as const,
  crop: { left: 0, top: 0, size: 100 },
};

describe('avatar source validation', () => {
  test('resolves the selected printing and side from the catalog', () => {
    expect(resolveAvatarImage(cardList, input)).toBe(
      `https://images.swubase.com/cards/${variant.image.front}`,
    );
    expect(resolveAvatarImage(cardList, { ...input, side: 'back' })).toBe(
      `https://images.swubase.com/cards/${variant.image.back}`,
    );
  });
  test('rejects missing cards, wrong variants, inherited keys and absent sides', () => {
    for (const patch of [
      { cardId: 'missing' },
      { variantId: 'missing' },
      { cardId: '__proto__' },
      { variantId: 'constructor' },
    ]) {
      expect(() => resolveAvatarImage(cardList, { ...input, ...patch })).toThrow();
    }
    const cards = {
      [card.cardId]: {
        ...card,
        variants: {
          [variant.variantId]: { ...variant, image: { front: variant.image.front, back: null } },
        },
      },
    };
    expect(() => resolveAvatarImage(cards, { ...input, side: 'back' })).toThrow();
  });
  test('rejects URLs and path traversal even in catalog data', () => {
    for (const path of [
      'https://example.com/a.webp',
      '//example.com/a.webp',
      '../avatar.webp',
      '%2e%2e/a.webp',
      'foo/../../a.webp',
      'foo.webp?x=1',
    ]) {
      const cards: CardList = {
        [card.cardId]: {
          ...card,
          variants: { [variant.variantId]: { ...variant, image: { front: path, back: null } } },
        },
      };
      expect(() => resolveAvatarImage(cards, input)).toThrow();
    }
  });
  test('rejects user IDs, uploaded image URLs and invalid crop geometry in requests', () => {
    for (const bad of [
      { ...input, userId: 'another-user' },
      { ...input, image: 'https://example.com/x.webp' },
      ...[{ left: -1 }, { top: 0.5 }, { size: 99 }, { size: Infinity }, { size: 9000 }].map(
        crop => ({ ...input, crop: { ...input.crop, ...crop } }),
      ),
    ])
      expect(userAvatarInputSchema.safeParse(bad).success).toBe(false);
  });
});

describe('avatar crop output', () => {
  test('extracts only the selected square and produces a 256px WebP', async () => {
    const source = await sharp({
      create: { width: 300, height: 200, channels: 3, background: '#ff0000' },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 100, height: 100, channels: 3, background: '#0000ff' },
          })
            .png()
            .toBuffer(),
          left: 200,
          top: 100,
        },
      ])
      .png()
      .toBuffer();
    const avatar = await cropAvatar(source, { left: 200, top: 100, size: 100 });
    expect(await sharp(avatar).metadata()).toMatchObject({
      width: 256,
      height: 256,
      format: 'webp',
    });
    const { channels } = await sharp(avatar).stats();
    expect(channels[0]!.max).toBeLessThan(10);
    expect(channels[2]!.min).toBeGreaterThan(245);
  });
  test('rejects undersized and out-of-bounds squares on portrait and landscape images', async () => {
    for (const [width, height] of [
      [300, 419],
      [419, 300],
    ]) {
      const source = await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
        .png()
        .toBuffer();
      for (const crop of [
        { left: 0, top: 0, size: 99 },
        { left: width - 99, top: 0, size: 100 },
        { left: 0, top: height - 99, size: 100 },
      ]) {
        await expect(cropAvatar(source, crop)).rejects.toThrow();
      }
      expect(
        (
          await sharp(
            await cropAvatar(source, { left: width - 100, top: height - 100, size: 100 }),
          ).metadata()
        ).width,
      ).toBe(256);
    }
  });
  test('handles corrupt source images without leaking processing errors', async () => {
    await expect(cropAvatar(Buffer.from('invalid image'), input.crop)).rejects.toThrow(
      'Could not process this card image. Try another version.',
    );
  });
});
