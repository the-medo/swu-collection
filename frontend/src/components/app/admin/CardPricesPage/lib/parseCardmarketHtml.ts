import { SwuSet } from '../../../../../../../types/enums.ts';
import { CardList } from '../../../../../../../lib/swu-resources/types.ts';
import { createFileName } from '../../../../../../../lib/swu-resources/lib/createFileName.ts';

export interface ParsedCardData {
  productId: string;
  link: string;
  nameDirty: string;
  name: string;
  cardNumber: string;
  cardId?: string;
  variantId?: string;
}

function cleanCardName(name: string): string {
  return name.replace(/\s*\(V\.\d+\)\s*$/, '').trim();
}

/**
 * Parses HTML content from Cardmarket to extract card data
 * @param htmlContent The HTML content to parse
 * @param selectedSet
 * @param cards
 * @returns Array of parsed card data
 */
export function parseCardmarketHtml(
  htmlContent: string,
  selectedSet: SwuSet,
  cards: CardList | undefined,
): ParsedCardData[] {
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Find all product rows
  const productRows = doc.querySelectorAll('div[id^="productRow"]');
  const results: ParsedCardData[] = [];

  productRows.forEach(row => {
    try {
      // Extract product ID from the row ID
      const rowId = row.id;
      const productId = rowId.replace('productRow', '');

      // Find the product link and name
      const linkElement = row.querySelector('a[href^="/en/StarWarsUnlimited/Products/"]');
      if (!linkElement) return;

      const link = linkElement.getAttribute('href') || '';
      const nameDirty = linkElement.textContent || '';
      const name = cleanCardName(nameDirty);

      // Find the card number (in the column right after the name)
      // It's in a div with class "col-md-2 d-none d-lg-flex has-content-centered"
      const cardNumberContainer = row.querySelector(
        '.col-md-2.d-none.d-lg-flex.has-content-centered',
      );
      const cardNumber = cardNumberContainer ? cardNumberContainer.textContent?.trim() || '' : '';

      let probableCardId: string | undefined = createFileName(name);
      let probableVariantId: string | undefined = undefined;
      if (cards && cards[probableCardId]) {
        console.log(cards[probableCardId]?.variants);
        const variant = Object.values(cards[probableCardId]?.variants || {}).find(v => {
          return v?.set === selectedSet && v?.cardNo === parseInt(cardNumber);
        });
        probableVariantId = variant?.variantId;
      } else {
        probableCardId = undefined;
      }

      results.push({
        productId,
        link,
        nameDirty,
        name,
        cardNumber,
        cardId: probableCardId,
        variantId: probableVariantId,
      });
    } catch (error) {
      console.error('Error parsing row:', error);
    }
  });

  return results;
}
