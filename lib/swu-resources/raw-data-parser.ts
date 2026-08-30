import * as fs from 'fs';
import { processCard } from './lib/processCard.ts';
import { setInfo } from './set-info.ts';
import type { SwuSet } from '../../types/enums.ts';
import { processArguments } from './lib/processArguments.ts';
import { fetchWithRetry } from './lib/fetchWithRetry.ts';

const imagePath = './lib/swu-resources/output/images';
export const pngImagePath = `${imagePath}/png`;
export const webpImagePath = `${imagePath}/webp`;

// Parse command line arguments

const params = processArguments();

const expansionsToProcess = params.expansions
  ? params.expansions.split(',').map(e => setInfo[e as SwuSet]?.expansionId ?? e)
  : [108];

async function main() {
  const failureLogPath = './lib/swu-resources/output/logs/failed-cards.json';
  const failedCards = new Map<
    string,
    { cardId: string; cardName: string; swuId: string; error: unknown }
  >();
  try {
    let cardCounter = 0;
    const startFrom = params.start ? parseInt(params.start) : 0;
    for (const expansionId of expansionsToProcess) {
      let totalPages = 1;

      for (let page = 1; page <= totalPages; page++) {
        let url;
        if (params.url) {
          console.log('Getting cards from url: ', params.url, '');
          url = params.url;
          url = url
            .replace('{expansionId}', expansionId.toString())
            .replace('{page}', page.toString());
        } else if (params.urlfile) {
          // Read URL from the specified file
          try {
            const urlFromFile = fs.readFileSync(params.urlfile, 'utf8').trim();
            url = urlFromFile
              .replace('{expansionId}', expansionId.toString())
              .replace('{page}', page.toString());
            console.log('URL loaded from file:', params.urlfile);
          } catch (error) {
            console.error(`Error reading URL from file ${params.urlfile}:`, error);
            process.exit(1);
          }
        } else {
          url = `https://admin.starwarsunlimited.com/api/card-list?locale=en&orderBy[expansion][id]=asc&sort[0]=type.sortValue%3Aasc%2C%20expansion.sortValue%3Adesc%2CcardNumber%3Aasc%2C&filters[$and][0][variantOf][id][$null]=true&filters[$and][1][expansion][id][$in][0]=${expansionId}&aspectMethod=0&traitMethod=0&pagination[page]=${page}&pagination[pageSize]=50`;
        }
        console.log('Getting cards from url: ', url, '');
        const cardsResponse = await fetchWithRetry(url);

        const cards = (await cardsResponse.json()) as any;

        const { data, meta } = cards;
        totalPages = meta.pagination.pageCount;

        for (const card of data) {
          cardCounter++;
          if (params.start && cardCounter < startFrom) continue;
          console.log(`==================== CARD ${cardCounter} ====================`);
          let skipExisting = true;
          if (params.skipExisting) {
            if (params.skipExisting === 'true') {
              skipExisting = true;
            } else if (params.skipExisting === 'false') {
              skipExisting = false;
            } else {
              console.error(
                `Invalid value for --skipExisting: ${params.skipExisting}. Must be true or false.`,
              );
              process.exit(1);
            }
          }
          const result = await processCard(card, skipExisting);
          if (result.success) failedCards.delete(result.cardId);
          else failedCards.set(result.cardId, result);
          console.log(`=============================================================`);
        }
      }
    }

    if (failedCards.size > 0) {
      fs.mkdirSync('./lib/swu-resources/output/logs', { recursive: true });
      fs.writeFileSync(
        failureLogPath,
        JSON.stringify(
          [...failedCards.values()].map(({ cardId, cardName, swuId, error }) => ({
            cardId,
            cardName,
            swuId,
            error: error instanceof Error ? error.message : String(error),
          })),
          null,
          2,
        ),
      );
      console.error(`\n\x1b[31m${failedCards.size} card(s) failed after all retries:\x1b[0m`);
      for (const failedCard of failedCards.values()) {
        console.error(
          `\x1b[31m- ${failedCard.cardName} (SWU ID ${failedCard.swuId}): ${String(failedCard.error)}\x1b[0m`,
        );
      }
      console.error(`\x1b[31mFailure details written to ${failureLogPath}.\x1b[0m`);
      process.exitCode = 1;
      return;
    }

    if (fs.existsSync(failureLogPath)) fs.rmSync(failureLogPath);
    console.log('Finished processing all cards successfully.');
  } catch (error) {
    console.error('Error loading JSON:', error);
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  if (params.help || params.h) {
    console.log(`
  Usage: bun ./raw-data-parser.ts [options]
  
  Options:
    --url=<url>                 Custom API URL to fetch cards from
                                Use {expansionId} and {page} as placeholders
    --urlfile=<path>            Path to a file containing the URL to use
                                This is preferred for complex URLs with special characters
    --expansions=<ids>          Comma-separated expansion IDs to process
    --start=<number>            Start processing from this card number
    --skipExisting=true|false   Skip cards with existing JSON file (default: true)
    --help, -h                  Show this help message
  
  Examples:
    bun ./lib/swu-resources/raw-data-parser.ts --urlfile=lib/swu-resources/url.txt
    bun ./lib/swu-resources/raw-data-parser.ts
    bun ./lib/swu-resources/raw-data-parser.ts --url="https://custom-api.com/cards?expansion={expansionId}&page={page}"
    bun ./lib/swu-resources/raw-data-parser.ts --expansions=sor,shd,twi
    bun ./lib/swu-resources/raw-data-parser.ts --start=50
  `);
    process.exit(0);
  }

  main();
}
