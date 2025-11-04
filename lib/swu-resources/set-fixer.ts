import path from 'path';
import fs, { promises as fsPromises } from 'fs';
import type { CardDataWithVariants, CardList, CardListVariants } from './types.ts';
import type { SwuSet } from '../../types/enums.ts';
import { setInfo } from './set-info.ts';

/**
 * this should be just one-time script to add "set" field to card-list.json for all cards
 */

const directoryPath = path.join(__dirname, './output/cards');
const outputPath = path.join('./server/db/json');

function getSetFromCard(card: CardDataWithVariants<CardListVariants>): SwuSet | undefined {
  let newestSet: SwuSet | undefined = undefined;

  Object.keys(card.variants).forEach(vId => {
    if (card.variants[vId]) {
      const s = card.variants[vId].set;
      if (!newestSet) newestSet = s;
      if (setInfo[s]?.sortValue > setInfo[newestSet]?.sortValue) newestSet = s;
    }
  });

  return newestSet;
}

async function processCardsDirectory() {
  try {
    let cardList: CardList = {};
    const cardListPath = path.join(outputPath, 'card-list.json');
    if (fs.existsSync(cardListPath)) {
      const data = await fsPromises.readFile(cardListPath, 'utf8');
      cardList = JSON.parse(data);
    }

    Object.keys(cardList).forEach(async cardId => {
      const newestCardSet = getSetFromCard(cardList[cardId]!);
      if (newestCardSet) {
        cardList[cardId]!.set = newestCardSet;
      } else {
        console.error(`No set found for card ${cardId}`);
      }
    });

    console.log(`All cards processed, writing file`);
    await fsPromises.writeFile(cardListPath, JSON.stringify(cardList, null, 2), 'utf8');
    console.log(`Done`);
  } catch (error) {
    console.log(`Error occurred while processing directory ${directoryPath}: `, error);
  }
}

await processCardsDirectory();
