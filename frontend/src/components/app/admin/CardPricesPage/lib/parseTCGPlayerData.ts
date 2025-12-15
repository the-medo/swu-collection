import { SwuSet } from '../../../../../../../types/enums.ts';
import { CardList, CardVariant } from '../../../../../../../lib/swu-resources/types.ts';
import { transformToId } from '../../../../../../../lib/swu-resources/lib/transformToId.ts';
import { ParsedCardData } from './parseCardmarketHtml.ts';
import { TCGCSV_SWU_ID } from '../../../../../../../shared/consts/constants.ts';

type TcgplayerProduct = {
  productId: number;
  name: string;
  url?: string;
  extendedData?: { name: string; value?: string | number | null }[];
};

function cleanCardName(name: string): string {
  // Remove trailing parenthetical content like "(Foil)"
  return name
    .replace(' - ', ', ')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
}

export async function parseTCGPlayerData(
  tcgPlayerGroupId: number,
  selectedSet: SwuSet | null,
  cards: CardList | undefined,
  preferredVariantName?: string,
  preferredVariantNameExact?: boolean,
): Promise<ParsedCardData[]> {
  try {
    const url = `https://tcgcsv.com/tcgplayer/${TCGCSV_SWU_ID}/${tcgPlayerGroupId}/products`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    const json = await res.json();
    const results: TcgplayerProduct[] = Array.isArray(json?.results) ? json.results : [];

    const matchPreferredVariantName = (v: CardVariant | undefined) => {
      if (!preferredVariantName || preferredVariantName === '' || !v) return false;
      return preferredVariantNameExact
        ? (v?.variantName || '').toLowerCase() === preferredVariantName
        : (v?.variantName || '').toLowerCase().includes(preferredVariantName);
    };

    return results.map(p => {
      const nameDirty = p.name || '';
      const name = cleanCardName(nameDirty);
      let cardNumber = '';
      if (Array.isArray(p.extendedData)) {
        const num = p.extendedData.find(ed => (ed?.name || '').toLowerCase() === 'number');
        if (num && (num.value || num.value === 0)) {
          // sometimes its just "40", sometimes its "40/264". Looks like its always a string, but converting just to be sure
          cardNumber = String(num.value).split('/')[0];
        }
      }

      let probableCardId: string | undefined = transformToId(name);
      let probableVariantId: string | undefined = undefined;
      if (cards && probableCardId && cards[probableCardId]) {
        const targetNo = parseInt(cardNumber);
        let foundPreferred;
        const candidates = Object.values(cards[probableCardId]?.variants || {}).filter(v => {
          const matchesNumber = Number.isFinite(targetNo) && v?.cardNo === targetNo;
          const matchesPreferredVariantName = matchPreferredVariantName(v);
          if (!matchesNumber && !matchesPreferredVariantName) return false;
          foundPreferred = v;
          return !selectedSet || v?.set === selectedSet;
        });

        let chosen = foundPreferred ?? candidates[0];
        probableVariantId = chosen?.variantId;
      } else {
        probableCardId = undefined;
      }

      return {
        productId: String(p.productId),
        link: p.url || '',
        nameDirty,
        name,
        cardNumber,
        cardId: probableCardId,
        variantId: probableVariantId,
      } as ParsedCardData;
    });
  } catch (e) {
    console.error('Failed to parse TCGplayer data', e);
    return [];
  }
}
