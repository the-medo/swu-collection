import { generateSetThumbnails, generateAllSetThumbnails } from './generateSetThumbnails';
import { SwuSet } from '../../../types/enums.ts';

async function testGenerateSetThumbnails() {
  try {
    // Test case 1: Generate thumbnails for a single set
    console.log('\n--- Test Case 1: Generate thumbnails for a single set (SOR) ---');
    console.log('Generating thumbnails for Spark of Rebellion set...');
    const thumbnailUrls = await generateSetThumbnails(SwuSet.SOR);

    console.log('Set thumbnails generated successfully!');
    console.log('Thumbnail URLs:');
    thumbnailUrls.forEach(url => console.log(`- ${url}`));

    // Test case 2: Generate thumbnails for another set
    console.log('\n--- Test Case 2: Generate thumbnails for another set (TWI) ---');
    console.log('Generating thumbnails for Twilight of the Republic set...');
    const thumbnailUrls2 = await generateSetThumbnails(SwuSet.TWI);

    console.log('Set thumbnails generated successfully!');
    console.log('Thumbnail URLs:');
    thumbnailUrls2.forEach(url => console.log(`- ${url}`));

    // Test case 3: Error handling with invalid set
    console.log('\n--- Test Case 3: Error handling with invalid set ---');
    console.log('Generating thumbnails with invalid set...');
    try {
      // @ts-ignore - Intentionally passing an invalid value
      const thumbnailUrls3 = await generateSetThumbnails('invalid-set');
      console.log('Set thumbnails generated successfully (unexpected)!');
      console.log('Thumbnail URLs:', thumbnailUrls3);
    } catch (error) {
      console.log('Error caught as expected:', (error as any).message);
    }

    // Test case 4: Generate thumbnails for all sets
    console.log('\n--- Test Case 4: Generate thumbnails for all sets ---');
    console.log('Generating thumbnails for all sets...');
    const startTime4 = Date.now();
    const result = await generateAllSetThumbnails();
    const endTime4 = Date.now();

    console.log('All set thumbnails generated!');
    console.log(`Successfully generated thumbnails for ${result.results.length} sets`);
    if (result.errors.length > 0) {
      console.log(`Failed to generate thumbnails for ${result.errors.length} sets`);
      result.errors.forEach(error => {
        console.log(`- Set ${error.set}: ${error.error}`);
      });
    }
    console.log(`Time taken: ${endTime4 - startTime4}ms`);

    // Test case 5: Generate thumbnails for a specific set using the batch function
    console.log('\n--- Test Case 5: Generate thumbnails for a specific set using the batch function ---');
    console.log('Generating thumbnails for SHD set using batch function...');
    const result2 = await generateAllSetThumbnails({ set: SwuSet.SHD });

    console.log('Operation completed!');
    console.log(`Successfully generated thumbnails for ${result2.results.length} sets`);
    if (result2.errors.length > 0) {
      console.log(`Failed to generate thumbnails for ${result2.errors.length} sets`);
      result2.errors.forEach(error => {
        console.log(`- Set ${error.set}: ${error.error}`);
      });
    }

    console.log('\n--- All tests completed successfully ---');
  } catch (error) {
    console.error('Error testing set thumbnail generation:', error);
  }
}

// Run the test
testGenerateSetThumbnails();