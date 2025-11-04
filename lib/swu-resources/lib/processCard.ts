import path from 'path';
import fs from 'fs';
import { mergeParsedCardAndVariants } from './mergeParsedCardAndVariants.ts';
import { transformToId } from './transformToId.ts';
import { delay } from './delay.ts';
import { processVariantWithoutImages } from './processVariantWithoutImages.ts';
import { mergeVariantsWithoutImages } from './mergeVariantsWithoutImages.ts';
import { processVariantImages } from './processVariantImages.ts';
import { downloadAndTransformVariantImages } from './downloadAndTransformVariantImages.ts';
import type { CardVariant, ParsedCardData } from '../types.ts';
import { setInfo } from '../set-info.ts';

export async function processCard(card: any, skipExisting = true) {
  const c = card.attributes;
  if (c.subtitle === '') c.subtitle = null;
  const cardName = c.subtitle !== null ? `${c.title}, ${c.subtitle}` : c.title;

  try {
    const parsedCard: ParsedCardData = {
      swuId: card.id,
      updatedAt: c.updatedAt,
      title: c.title,
      subtitle: c.subtitle,
      name: cardName,
      cardId: transformToId(cardName),
      artist: c.artist,
      cost: c.cost,
      hp: c.hp,
      power: c.power,
      upgradeHp: c.upgradeHp,
      upgradePower: c.upgradePower,
      deployBox: c.deployBox,
      epicAction: c.epicAction,
      text: c.text,
      rules: c.rules,
      cardNo: c.cardNumber,
      thumbnail: c.artFront.data.attributes.formats.thumbnail.url,
      front: {
        horizontal: !!c.artFrontHorizontal,
        image: c.artFront.data.attributes.url,
      },
      back:
        c.artBack.data !== null
          ? {
              horizontal: !!c.artBackHorizontal,
              image: c.artBack.data.attributes.url,
              type: c.type2.data?.attributes.name ?? c.type.data.attributes.name,
            }
          : null,
      set: c.expansion.data.attributes.code.toLowerCase(),
      aspects: c.aspects.data
        .map((a: any) => a.attributes.name)
        .concat(c.aspectDuplicates.data.map((a: any) => a.attributes.name)),
      type: c.type.data.attributes.name,
      keywords: c.keywords.data.map((a: any) => a.attributes.name),
      arenas: c.arenas.data.map((a: any) => a.attributes.name),
      rarity: c.rarity.data.attributes.name,
      traits: c.traits.data.map((a: any) => a.attributes.name),
    };

    let filename = transformToId(parsedCard.cardId);
    let dirpath = path.resolve(`./lib/swu-resources/output/parsed/${parsedCard.set}`);
    let filepath = path.join(dirpath, `${filename}.json`);
    fs.mkdirSync(dirpath, { recursive: true });

    if (fs.existsSync(filepath) && skipExisting) {
      console.log(`File ${filepath} already exists, skipping.`);
      return;
    }

    fs.writeFileSync(filepath, JSON.stringify(parsedCard, null, 2));
    console.log(`Saved ${parsedCard.name} to ${filepath}`);

    const variantsResponse = await fetch(
      `https://admin.starwarsunlimited.com/api/card/printings/${parsedCard.swuId}?locale=all`,
    );

    if (!variantsResponse.ok) {
      throw new Error(`HTTP error! status: ${variantsResponse.status}`);
    }

    const variants = (await variantsResponse.json()) as any;
    await delay(500);

    let allVariants: CardVariant[] = [
      processVariantWithoutImages(variants.data.original),
      ...variants.data.printings.map((x: any) => processVariantWithoutImages(x)),
    ];

    allVariants = mergeVariantsWithoutImages(allVariants);

    let newestSet = parsedCard.set;
    for (const p of allVariants) {
      if (setInfo[p.set]?.sortValue > setInfo[newestSet]?.sortValue) {
        newestSet = p.set;
      }
      await processVariantImages(p);
      await downloadAndTransformVariantImages(p, parsedCard.cardId);
    }
    parsedCard.set = newestSet;

    const finalObject = mergeParsedCardAndVariants(allVariants, parsedCard);

    filename = transformToId(parsedCard.cardId);
    dirpath = path.resolve(`./lib/swu-resources/output/cards`);
    filepath = path.join(dirpath, `${filename}.json`);
    fs.mkdirSync(dirpath, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(finalObject, null, 2));
    console.log(`Saved ${parsedCard.name} to ${filepath}`);
  } catch (err) {
    console.error(`Error processing card ${cardName}:`, err);
  }
}
