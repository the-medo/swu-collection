import type { CardPrinting, ParsedCardData } from '../types.ts';
import path from 'path';
import fs from 'fs';
import { mergeParsedCardAndPrintings } from './mergeParsedCardAndPrintings.ts';
import { createFileName } from './createFileName.ts';
import { delay } from './delay.ts';
import { processPrintingWithoutImages } from './processPrintingWithoutImages.ts';
import { mergePrintingsWithoutImages } from './mergePrintingsWithoutImages.ts';
import { processPrintingImages } from './processPrintingImages.ts';
import { downloadAndTransformPrintingImages } from './downloadAndTransformPrintingImages.ts';

export async function processCard(card: any) {
  const c = card.attributes;
  const cardName = c.subtitle !== null ? `${c.title}, ${c.subtitle}` : c.title;

  try {
    const parsedCard: ParsedCardData = {
      swuId: card.id,
      updatedAt: c.updatedAt,
      title: c.title,
      subtitle: c.subtitle,
      name: cardName,
      cardId: createFileName(cardName),
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
              type: c.type2.data.attributes.name,
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

    let filename = createFileName(parsedCard.cardId);
    let dirpath = path.resolve(`./lib/swu-resources/output/parsed/${parsedCard.set}`);
    let filepath = path.join(dirpath, `${filename}.json`);
    fs.mkdirSync(dirpath, { recursive: true });

    if (fs.existsSync(filepath)) {
      console.log(`File ${filepath} already exists, skipping.`);
      return;
    }

    fs.writeFileSync(filepath, JSON.stringify(parsedCard, null, 2));
    console.log(`Saved ${parsedCard.name} to ${filepath}`);

    const printingsResponse = await fetch(
      `https://admin.starwarsunlimited.com/api/card/printings/${parsedCard.swuId}?locale=all`,
    );

    if (!printingsResponse.ok) {
      throw new Error(`HTTP error! status: ${printingsResponse.status}`);
    }

    const printings = (await printingsResponse.json()) as any;
    await delay(1000);

    let allPrintings: CardPrinting[] = [
      processPrintingWithoutImages(printings.data.original),
      ...printings.data.printings.map((x: any) => processPrintingWithoutImages(x)),
    ];

    allPrintings = mergePrintingsWithoutImages(allPrintings);

    for (const p of allPrintings) {
      await processPrintingImages(p);
      await downloadAndTransformPrintingImages(p, parsedCard.cardId);
    }

    const finalObject = mergeParsedCardAndPrintings(allPrintings, parsedCard);

    filename = createFileName(parsedCard.cardId);
    dirpath = path.resolve(`./lib/swu-resources/output/cards`);
    filepath = path.join(dirpath, `${filename}.json`);
    fs.mkdirSync(dirpath, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(finalObject, null, 2));
    console.log(`Saved ${parsedCard.name} to ${filepath}`);
  } catch (err) {
    console.error(`Error processing card ${cardName}:`, err);
  }
}
