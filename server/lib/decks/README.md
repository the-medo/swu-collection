# Deck Thumbnail Generator

This module provides functionality to generate thumbnail images for decks in the SWU Collection application.

## `generateDeckThumbnail` Function

The `generateDeckThumbnail` function creates a thumbnail image for a deck and uploads it to the R2 bucket. It automatically fetches the necessary card images from the card list using the provided leader and base IDs.

### Parameters

- `leaderId` (string): The ID of the leader card
- `baseId` (string): The ID of the base card
- `options` (object, optional): Additional options
  - `logoUrl` (string, optional): Custom logo URL (defaults to SWUBase logo)
  - `backgroundColor` (object, optional): Custom background color (defaults to dark grey)
    - `r` (number): Red component (0-255)
    - `g` (number): Green component (0-255)
    - `b` (number): Blue component (0-255)
    - `alpha` (number): Alpha component (0-1)
  - `forceUpload` (boolean, optional): Force upload even if the image already exists (defaults to false)

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
  'death-star'
);

// With custom options
const customThumbnailUrl = await generateDeckThumbnail(
  'luke-skywalker--jedi-knight',
  'millennium-falcon',
  {
    backgroundColor: { r: 20, g: 20, b: 80, alpha: 1 }, // Dark blue background
    logoUrl: 'https://example.com/custom-logo.png'
  }
);

// Force upload even if the image already exists
const forcedThumbnailUrl = await generateDeckThumbnail(
  'han-solo--scoundrel',
  'rebel-base',
  {
    forceUpload: true // Force regeneration and upload even if the image exists
  }
);
```

### Error Handling

The function includes robust error handling:
- If the leader or base card cannot be found in the card list, an error is thrown
- If no variant can be found for the leader or base card, an error is thrown
- If images cannot be fetched, fallback colored rectangles are used
- If the logo cannot be loaded, it is omitted from the thumbnail
- All errors are logged for debugging purposes

## Performance Considerations

The thumbnail generation process can take 7-10 seconds due to several factors:

1. **Network Requests**: The function makes multiple network requests to fetch images (leader card, base card, logo).
   - Ensure your network connection is stable and fast.
   - Consider caching frequently used images locally if possible.

2. **Image Processing**: Sharp operations (resizing, compositing) are CPU-intensive.
   - Use appropriate hardware with sufficient CPU resources.
   - Consider reducing image quality or dimensions if speed is more important than quality.

3. **S3 Upload**: Uploading to the R2 bucket can take time depending on file size and network conditions.
   - The function now checks if the image already exists before generating it, which can significantly improve performance for repeated calls.
   - Use the `forceUpload` parameter only when necessary to regenerate thumbnails.

## Testing

A test script (`testDeckThumbnail.ts`) is provided to verify the functionality of the `generateDeckThumbnail` function. It includes test cases for:
- Basic functionality with valid card IDs
- Custom background color
- Error handling with invalid card IDs
- Checking if an image already exists (skipping generation)
- Forcing regeneration even if the image exists

To run the test:

```bash
bun run server/lib/decks/testDeckThumbnail.ts
```
