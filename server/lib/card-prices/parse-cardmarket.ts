import { parseHTML } from 'linkedom';

// Helper function to convert price strings to numbers
function parsePrice(priceString: string): number {
  if (!priceString) return 0;
  // Remove € symbol and spaces, replace comma with dot for decimal
  const cleanPrice = priceString.replace(/€/g, '').replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleanPrice) || 0;
}

interface CMListingData {
  price: number;
  quantity: number;
}

interface CMPricingData {
  availableItems: number;
  fromPrice: number;
  priceTrend: number;
  averagePrice30Days: number;
  averagePrice7Days: number;
  averagePrice1Day: number;
  topListings: CMListingData[];
}

export async function parseCardMarketPricing(
  cardId: string,
  variantId: string,
  sourceType: string,
  sourceLink: string,
): Promise<CMPricingData> {
  // Construct URL with required parameters
  const url = `${sourceLink}?language=1&minCondition=2`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const html = await response.text();
    const { document } = parseHTML(html);

    // Parse pricing data
    const bodyText = document.body.textContent || '';

    // Extract pricing information
    const availableItemsMatch = bodyText.match(/Available items\s*(\d+)/);
    const fromPriceMatch = bodyText.match(/From\s*([\d,]+[.,]\d+\s*€)/);
    const priceTrendMatch = bodyText.match(/Price Trend\s*([\d,]+[.,]\d+\s*€)/);
    const avg30Match = bodyText.match(/30-days average price\s*([\d,]+[.,]\d+\s*€)/);
    const avg7Match = bodyText.match(/7-days average price\s*([\d,]+[.,]\d+\s*€)/);
    const avg1Match = bodyText.match(/1-day average price\s*([\d,]+[.,]\d+\s*€)/);

    const topListings: CMListingData[] = [];

    // Find all listing rows
    const listingRows = document.querySelectorAll('.row.g-0.article-row');

    // Extract data from first 3 listings
    for (let i = 0; i < Math.min(3, listingRows.length); i++) {
      const row = listingRows[i];

      // Extract seller name - look for the seller link element
      const sellerElement = row.querySelector('.d-flex.has-content-centered.me-1 a');
      const seller = sellerElement?.textContent?.trim() || '';

      // Extract price - get the second price (actual selling price, not the higher one)
      const rowText = row.textContent || '';
      const priceMatches = rowText.match(/([\d,]+[.,]\d+\s*€)/g);
      const priceString =
        priceMatches && priceMatches.length > 1
          ? priceMatches[1] // Take the second price (lower/actual selling price)
          : priceMatches && priceMatches.length > 0
          ? priceMatches[0] // Fallback to first price if only one exists
          : '';
      const price = parsePrice(priceString);

      // Extract quantity - usually the last number in the row
      const quantityMatch = rowText.match(/(\d+)$/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

      if (seller && price) {
        topListings.push({
          price,
          quantity,
        });
      }
    }

    const pricingData: CMPricingData = {
      availableItems: availableItemsMatch ? parseInt(availableItemsMatch[1]) : 0,
      fromPrice: parsePrice(fromPriceMatch ? fromPriceMatch[1] : ''),
      priceTrend: parsePrice(priceTrendMatch ? priceTrendMatch[1] : ''),
      averagePrice30Days: parsePrice(avg30Match ? avg30Match[1] : ''),
      averagePrice7Days: parsePrice(avg7Match ? avg7Match[1] : ''),
      averagePrice1Day: parsePrice(avg1Match ? avg1Match[1] : ''),
      topListings,
    };

    return pricingData;
  } catch (error) {
    console.error('Error parsing CardMarket data:', error);
    throw error;
  }
}
