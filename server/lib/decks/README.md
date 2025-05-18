# Deck Thumbnail Generator

This module provides functionality to generate thumbnail images for decks in the SWU Collection application.

## `generateDeckThumbnail` Function

The `generateDeckThumbnail` function creates a thumbnail image for a deck and uploads it to the R2 bucket.

### Parameters

- `leaderId` (string): The ID of the leader card
- `baseId` (string): The ID of the base card
- `leaderBackImageUrl` (string): URL to the back side of the leader card image
- `baseImageUrl` (string): URL to the base card image
- `options` (object, optional): Additional options
  - `logoUrl` (string, optional): Custom logo URL (defaults to SWUBase logo)
  - `backgroundColor` (object, optional): Custom background color (defaults to dark grey)
    - `r` (number): Red component (0-255)
    - `g` (number): Green component (0-255)
    - `b` (number): Blue component (0-255)
    - `alpha` (number): Alpha component (0-1)

### Returns

- Promise<string>: The URL of the generated thumbnail image

### Image Specifications

The generated thumbnail has the following specifications:
- Dimensions: 419x419 pixels
- Background: Dark grey (customizable)
- Leader card: Placed in the center (back side)
- Base card: Resized to 300px width and placed at the bottom middle
- SWUBase logo: Placed in the bottom right corner

### Example Usage

```typescript
import { generateDeckThumbnail } from './generateDeckThumbnail';

// Basic usage
const thumbnailUrl = await generateDeckThumbnail(
  'darth-vader--dark-lord-of-the-sith',
  'death-star',
  'https://images.swubase.com/cards/darth-vader--dark-lord-of-the-sith-1-core-set-back.webp',
  'https://images.swubase.com/cards/death-star-1-core-set-front.webp'
);

// With custom options
const customThumbnailUrl = await generateDeckThumbnail(
  'luke-skywalker--jedi-knight',
  'millennium-falcon',
  'https://images.swubase.com/cards/luke-skywalker--jedi-knight-1-core-set-back.webp',
  'https://images.swubase.com/cards/millennium-falcon-1-core-set-front.webp',
  {
    backgroundColor: { r: 20, g: 20, b: 80, alpha: 1 }, // Dark blue background
    logoUrl: 'https://example.com/custom-logo.png'
  }
);
```

### Error Handling

The function includes robust error handling:
- If images cannot be fetched, fallback colored rectangles are used
- If the logo cannot be loaded, it is omitted from the thumbnail
- All errors are logged for debugging purposes

## Testing

A test script (`testDeckThumbnail.ts`) is provided to verify the functionality of the `generateDeckThumbnail` function. It includes test cases for:
- Basic functionality with valid images
- Custom background color
- Error handling with invalid image URLs

To run the test:

```bash
bun run server/lib/decks/testDeckThumbnail.ts
```