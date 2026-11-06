import path from 'path';
import fs, { promises as fsPromises } from 'fs';
import type { CardDataWithVariants, CardList } from './types.ts';
import { mergeCardData } from './lib/mergeCardData.ts';
import { processArguments } from './lib/processArguments.ts';

const directoryPath = path.join(__dirname, './output/cards');
const outputPath = path.join('./server/db/json');
// Deliberate rarity corrections must name the reviewed cards: --updateRarity=card-id,card-id
const updateRarity = new Set((processArguments().updateRarity ?? '').split(',').filter(Boolean));

async function addCardToCardList(filePath: string, cl: CardList) {
  try {
    const data = await fsPromises.readFile(filePath, 'utf8');
    const cardData = JSON.parse(data) as CardDataWithVariants;

    const { cardId } = cardData;
    const previous = cl[cardId];
    if (previous && previous.rarity !== cardData.rarity && !updateRarity.has(cardId)) {
      console.log(
        `Keeping ${cardId} rarity ${previous.rarity} for existing sealed pools; ` +
          `use --updateRarity=${cardId} only for a deliberate correction to ${cardData.rarity}.`,
      );
    }
    cl[cardId] = mergeCardData(cardData, previous, { updateRarity: updateRarity.has(cardId) });
    console.log(`Card ${cardId} processed`);
  } catch (error) {
    throw new Error(`Error occurred while merging ${filePath}`, { cause: error });
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
    console.error(`Error occurred while processing directory ${directoryPath}: `, error);
    process.exitCode = 1;
  }
}

await processCardsDirectory();
