// import * as fs from 'fs';
import { processCard } from './lib/processCard.ts';
import { setInfo } from './set-info.ts';

const imagePath = './lib/swu-resources/output/images';
export const pngImagePath = `${imagePath}/png`;
export const webpImagePath = `${imagePath}/webp`;

// const jsonData = fs.readFileSync('./lib/swu-resources/test-jsons/sor_raw_2.json', 'utf8');

const expansionsToProcess = [
  setInfo.sor?.expansionId,
  setInfo.shd?.expansionId,
  setInfo.twi?.expansionId,
];

async function main() {
  try {
    let cardCounter = 0;
    for (const expansionId of expansionsToProcess) {
      let totalPages = 1;

      for (let page = 1; page <= totalPages; page++) {
        const cardsResponse = await fetch(
          `https://admin.starwarsunlimited.com/api/card-list?locale=en&orderBy[expansion][id]=asc&sort[0]=type.sortValue%3Aasc%2C%20expansion.sortValue%3Adesc%2CcardNumber%3Aasc%2C&filters[$and][0][variantOf][id][$null]=true&filters[$and][1][expansion][id][$in][0]=${expansionId}&aspectMethod=0&traitMethod=0&pagination[page]=${page}&pagination[pageSize]=50`,
        );

        if (!cardsResponse.ok) {
          throw new Error(`HTTP error! status: ${cardsResponse.status}`);
        }

        const cards = (await cardsResponse.json()) as any;

        const { data, meta } = cards;
        totalPages = meta.pagination.pageCount;

        for (const card of data) {
          cardCounter++;
          if (cardCounter <= 511) continue;
          console.log(`==================== CARD ${cardCounter} ====================`);
          await processCard(card);
          console.log(`=============================================================`);
        }
      }
    }

    console.log('Finished processing all cards.');
  } catch (error) {
    console.error('Error loading JSON:', error);
  }
}

main();
