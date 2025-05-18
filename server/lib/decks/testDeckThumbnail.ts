import { generateDeckThumbnail } from './generateDeckThumbnail';

async function testGenerateDeckThumbnail() {
  try {
    // Test case 1: Basic functionality with valid images
    console.log('\n--- Test Case 1: Basic functionality ---');
    const leaderId1 = 'darth-vader--dark-lord-of-the-sith';
    const baseId1 = 'death-star';
    const leaderBackImageUrl1 =
      'https://images.swubase.com/cards/rose-tico--saving-what-we-love-4-jump-to-lightspeed-back.webp';
    const baseImageUrl1 =
      'https://images.swubase.com/cards/tarkintown-25-spark-of-rebellion-front.webp';

    console.log('Generating deck thumbnail with default options...');
    const thumbnailUrl1 = await generateDeckThumbnail(
      leaderId1,
      baseId1,
      leaderBackImageUrl1,
      baseImageUrl1,
    );

    console.log('Deck thumbnail generated successfully!');
    console.log('Thumbnail URL:', thumbnailUrl1);

    // Test case 2: Custom background color
    console.log('\n--- Test Case 2: Custom background color ---');
    const leaderId2 = 'luke-skywalker--jedi-knight';
    const baseId2 = 'millennium-falcon';
    const leaderBackImageUrl2 =
      'https://images.swubase.com/cards/rose-tico--saving-what-we-love-4-jump-to-lightspeed-back.webp';
    const baseImageUrl2 =
      'https://images.swubase.com/cards/tarkintown-25-spark-of-rebellion-front.webp';

    console.log('Generating deck thumbnail with custom background color...');
    const thumbnailUrl2 = await generateDeckThumbnail(
      leaderId2,
      baseId2,
      leaderBackImageUrl2,
      baseImageUrl2,
      {
        backgroundColor: { r: 20, g: 20, b: 80, alpha: 1 }, // Dark blue background
      },
    );

    console.log('Deck thumbnail with custom background generated successfully!');
    console.log('Thumbnail URL:', thumbnailUrl2);

    // Test case 3: Error handling with invalid image URL
    console.log('\n--- Test Case 3: Error handling with invalid image URL ---');
    const leaderId3 = 'obi-wan-kenobi';
    const baseId3 = 'jedi-temple';
    const leaderBackImageUrl3 = 'https://images.swubase.com/cards/nonexistent-image.webp'; // Invalid URL
    const baseImageUrl3 =
      'https://images.swubase.com/cards/tarkintown-25-spark-of-rebellion-front.webp';

    console.log('Generating deck thumbnail with invalid leader image URL...');
    const thumbnailUrl3 = await generateDeckThumbnail(
      leaderId3,
      baseId3,
      leaderBackImageUrl3,
      baseImageUrl3,
    );

    console.log('Deck thumbnail generated successfully with fallback image!');
    console.log('Thumbnail URL:', thumbnailUrl3);

    console.log('\n--- All tests completed successfully ---');
  } catch (error) {
    console.error('Error testing deck thumbnail generation:', error);
  }
}

// Run the test
testGenerateDeckThumbnail();
