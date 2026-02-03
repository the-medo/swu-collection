import path from 'path';
import fs, { promises as fsPromises } from 'fs';
import type { CardDataWithVariants, CardList, CardListVariants } from './types.ts';
import type { SwuSet } from '../../types/enums.ts';

const directoryPath = path.join(__dirname, './output/cards');
const outputPath = path.join('./server/db/json');

async function addCardToCardList(filePath: string, cl: CardList) {
  try {
    const data = await fsPromises.readFile(filePath, 'utf8');
    const cardData = JSON.parse(data) as CardDataWithVariants;

    const { cardId, variants } = cardData;
    let oldVariants: CardListVariants = {};

    if (cl[cardId]) {
      oldVariants = cl[cardId]?.variants;
    }

    cl[cardId] = {
      ...cardData,
      set: cardData.set ?? cl[cardId]?.set, // use the old set when not present in card data
      variants: {},
    };
    variants.forEach(v => {
      cl[cardId]!.variants[v.variantId] = v;
    });

    Object.keys(oldVariants).forEach(ovId => {
      if (!cl[cardId]!.variants[ovId]) {
        console.error('Missing variant: ', ovId, ' in ', cardId, ', adding it back');
        cl[cardId]!.variants[ovId] = oldVariants[ovId]!;
      }
    });
    console.log(`Card ${cardId} processed`);
  } catch (error) {
    console.error(`Error occurred while modifying file ${filePath}: `, error);
  }
}

async function processCardsDirectory() {
  try {
    let cardList: CardList = {};
    const cardListPath = path.join(outputPath, 'card-list.json');
    if (fs.existsSync(cardListPath)) {
      const data = await fsPromises.readFile(cardListPath, 'utf8');
      cardList = JSON.parse(data);
    }

    const files = await fsPromises.readdir(directoryPath);

    const jsonFiles = files.filter(file => path.extname(file) === '.json');

    for (const file of jsonFiles) {
      await addCardToCardList(path.join(directoryPath, file), cardList);
    }
    console.log(`All cards processed, writing file`);
    await fsPromises.writeFile(cardListPath, JSON.stringify(cardList, null, 2), 'utf8');
    console.log(`Done`);
  } catch (error) {
    console.log(`Error occurred while processing directory ${directoryPath}: `, error);
  }
}

await processCardsDirectory();
