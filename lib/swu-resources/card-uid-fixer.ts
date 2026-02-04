import path from 'path';
import fs, { promises as fsPromises } from 'fs';
import type { CardList } from './types.ts';

/**
 * One-time script to add `cardUid` to non-token card objects in card-list.json
 * by looking up `{SET}_{CARD_NUMBER}` in set_code_map.json.
 */

const setCodeMapPath = path.join('./lib/swu-resources/test-jsons'); // set_code_map.json
const cardListPath = path.join('./server/db/json'); // card-list.json

type SetCodeMap = Record<string, string>;

function isTokenCard(cardType: unknown): boolean {
  if (typeof cardType !== 'string') return false;
  return cardType.toLowerCase().includes('token');
}

function normalizeCardNumber(cardNumber: unknown): string | undefined {
  if (cardNumber == null) return undefined;

  const raw = String(cardNumber).trim();
  if (!raw) return undefined;

  // If it's purely digits, pad to at least 3 chars to match keys like "SOR_005".
  // If it's already "005" or longer ("102", "1001"), keep as-is.
  if (/^\d+$/.test(raw)) return raw.padStart(3, '0');

  // If it contains non-digits (rare), use as-is.
  return raw;
}

async function loadJsonFile<T>(filePath: string): Promise<T> {
  const data = await fsPromises.readFile(filePath, 'utf8');
  return JSON.parse(data) as T;
}

async function processCardList() {
  const cardListFile = path.join(cardListPath, 'card-list.json');
  const setCodeMapFile = path.join(setCodeMapPath, 'set_code_map.json');

  if (!fs.existsSync(cardListFile)) {
    throw new Error(`Missing file: ${cardListFile}`);
  }
  if (!fs.existsSync(setCodeMapFile)) {
    throw new Error(`Missing file: ${setCodeMapFile}`);
  }

  const cardList = await loadJsonFile<CardList>(cardListFile);
  const setCodeMap = await loadJsonFile<SetCodeMap>(setCodeMapFile);

  let updatedCards = 0;
  let skippedTokens = 0;
  let notFound = 0;

  for (const cardId of Object.keys(cardList)) {
    const card = cardList[cardId];
    if (!card) continue;

    if (isTokenCard((card as any).type)) {
      skippedTokens++;
      continue;
    }

    const variants = (card as any).variants as Record<string, any> | undefined;
    if (!variants) {
      notFound++;
      continue;
    }

    // Find the first variant that resolves to a setCodeMap entry.
    let foundUid: string | undefined;

    for (const vId of Object.keys(variants)) {
      const v = variants[vId];
      if (!v) continue;

      const set = typeof v.set === 'string' ? v.set.trim() : undefined;

      const cardNumber = normalizeCardNumber(v.cardNo);

      if (!set || !cardNumber) continue;

      const key = `${set}_${cardNumber}`.toUpperCase();
      const uid = setCodeMap[key];
      if (uid) {
        foundUid = uid;
        break;
      }
    }

    if (foundUid) {
      // Save cardUid at the card object level (as requested)
      (card as any).cardUid = foundUid;
      updatedCards++;
    } else {
      notFound++;
    }
  }

  await fsPromises.writeFile(cardListFile, JSON.stringify(cardList, null, 2), 'utf8');

  console.log(
    [
      `Done writing ${cardListFile}`,
      `Updated cards: ${updatedCards}`,
      `Skipped token cards: ${skippedTokens}`,
      `No uid found (or missing variants): ${notFound}`,
    ].join('\n'),
  );
}

await processCardList();
