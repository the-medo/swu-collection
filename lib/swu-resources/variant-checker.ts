import path from 'path';
import type { CardList } from './types.ts';
import fs, { promises as fsPromises } from 'fs';
import { processArguments } from './lib/processArguments.ts';

const directoryPath = path.join(__dirname, './output/cards');
const outputPath = path.join('./server/db/json');

type CardIdWithVariants = {
  [key: string]: Record<string, true>;
};

const params = processArguments();

// const variantsToCheck = ['Standard', 'Standard Foil', 'Hyperspace', 'Hyperspace Foil'];
const variantsToCheck = ['Standard', 'Hyperspace'];

async function checkVariants() {
  try {
    let cardList: CardList = {};
    const cardListPath = path.join(outputPath, 'card-list.json');
    if (fs.existsSync(cardListPath)) {
      const data = await fsPromises.readFile(cardListPath, 'utf8');
      cardList = JSON.parse(data);
    }

    const cardIdWithVariants: CardIdWithVariants = {
      All: {},
    };
    variantsToCheck.forEach(vtc => (cardIdWithVariants[vtc] = {}));

    Object.values(cardList).forEach(card => {
      if (!card) return;

      Object.values(card.variants).forEach(variant => {
        if (!variant) return;
        if (variant.set === params['set']) {
          if (!cardIdWithVariants.All[card.cardId]) {
            cardIdWithVariants.All[card.cardId] = true;
          }
          const variantName = variant.variantName;
          if (variantName in cardIdWithVariants) {
            cardIdWithVariants[variantName][card.cardId] = true;
          }
        }
      });
    });

    console.log(` ===== Checking variants for set ${params['set']} ===== `);
    console.log(` Total cards: ${Object.keys(cardIdWithVariants.All).length} `);

    Object.keys(cardIdWithVariants.All).forEach(cardId => {
      let missingVariants: string[] = [];
      variantsToCheck.forEach(vtc => {
        if (!cardIdWithVariants[vtc][cardId]) missingVariants.push(vtc);
      });
      if (missingVariants.length > 0) {
        console.log(`Card ID: ${cardId} - Missing Variants: ${missingVariants.join(', ')}`);
      }
    });

    console.log(` ===== FINISHED ===== `);
  } catch (error) {
    console.log(`Error occurred while processing directory ${directoryPath}: `, error);
  }
}

await checkVariants();
