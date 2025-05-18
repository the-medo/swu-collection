import { generateDeckThumbnail } from './generateDeckThumbnail';

async function testGenerateDeckThumbnail() {
  try {
    // Test case 1: Basic functionality with valid images
    console.log('\n--- Test Case 1: Basic functionality ---');
    const leaderId1 = 'darth-vader--dark-lord-of-the-sith';
    const baseId1 = 'command-center';

    console.log('Generating deck thumbnail with default options...');
    const thumbnailUrl1 = await generateDeckThumbnail(leaderId1, baseId1);

    console.log('Deck thumbnail generated successfully!');
    console.log('Thumbnail URL:', thumbnailUrl1);

    // Test case 2: Custom background color
    console.log('\n--- Test Case 2: Custom background color ---');
    const leaderId2 = 'luke-skywalker--faithful-friend';
    const baseId2 = 'lake-country';

    console.log('Generating deck thumbnail with custom background color...');
    const thumbnailUrl2 = await generateDeckThumbnail(leaderId2, baseId2, {
      backgroundColor: { r: 20, g: 20, b: 80, alpha: 1 }, // Dark blue background
    });

    console.log('Deck thumbnail with custom background generated successfully!');
    console.log('Thumbnail URL:', thumbnailUrl2);

    // Test case 3: Error handling with invalid card IDs
    console.log('\n--- Test Case 3: Error handling with invalid card IDs ---');
    const leaderId3 = 'nonexistent-leader';
    const baseId3 = 'nonexistent-base';

    console.log('Generating deck thumbnail with invalid card IDs...');
    try {
      const thumbnailUrl3 = await generateDeckThumbnail(leaderId3, baseId3);
      console.log('Deck thumbnail generated successfully (unexpected)!');
      console.log('Thumbnail URL:', thumbnailUrl3);
    } catch (error) {
      console.log('Error caught as expected:', (error as any).message);
    }

    // Test case 4: Check if image exists (should skip generation)
    console.log('\n--- Test Case 4: Check if image exists (should skip generation) ---');
    console.log('Generating the same thumbnail again (should skip generation)...');
    const startTime4 = Date.now();
    const thumbnailUrl4 = await generateDeckThumbnail(leaderId1, baseId1);
    const endTime4 = Date.now();

    console.log('Operation completed!');
    console.log('Thumbnail URL:', thumbnailUrl4);
    console.log(
      `Time taken: ${endTime4 - startTime4}ms (should be much faster than first generation)`,
    );

    // Test case 5: Force upload even if image exists
    console.log('\n--- Test Case 5: Force upload even if image exists ---');
    console.log('Forcing regeneration of the same thumbnail...');
    const startTime5 = Date.now();
    const thumbnailUrl5 = await generateDeckThumbnail(leaderId1, baseId1, {
      forceUpload: true,
    });
    const endTime5 = Date.now();

    console.log('Forced regeneration completed!');
    console.log('Thumbnail URL:', thumbnailUrl5);
    console.log(`Time taken: ${endTime5 - startTime5}ms (should be similar to first generation)`);

    console.log('\n--- All tests completed successfully ---');
  } catch (error) {
    console.error('Error testing deck thumbnail generation:', error);
  }
}

// Run the test
testGenerateDeckThumbnail();
