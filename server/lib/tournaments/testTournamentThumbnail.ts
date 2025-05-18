import { generateTournamentThumbnail } from './generateTournamentThumbnail';

async function testGenerateTournamentThumbnail() {
  try {
    // Test case 1: Basic functionality with valid tournament data
    console.log('\n--- Test Case 1: Basic functionality ---');
    const tournamentData1 = {
      id: 'test-tournament-1',
      type: 'local',
      name: 'SQ - Richmond, US',
      date: new Date('2023-12-15'),
      countryCode: 'ES',
      attendance: 860,
    };

    console.log('Generating tournament thumbnail with default options...');
    const thumbnailUrl1 = await generateTournamentThumbnail(tournamentData1);

    console.log('Tournament thumbnail generated successfully!');
    console.log('Thumbnail URL:', thumbnailUrl1);

    // Test case 2: Different tournament type
    console.log('\n--- Test Case 2: Different tournament type ---');
    const tournamentData2 = {
      id: 'test-tournament-2',
      type: 'ma1',
      name: 'Test Major Tournament',
      date: new Date('2023-11-20'),
      countryCode: 'London, UK',
    };

    console.log('Generating thumbnail for a major tournament...');
    const thumbnailUrl2 = await generateTournamentThumbnail(tournamentData2);

    console.log('Tournament thumbnail generated successfully!');
    console.log('Thumbnail URL:', thumbnailUrl2);

    // Test case 3: Error handling with invalid tournament data
    console.log('\n--- Test Case 3: Error handling with invalid tournament data ---');
    const invalidTournamentData = {
      id: '',
      type: 'invalid-type',
      name: 'Invalid Tournament',
      date: new Date(),
      countryCode: 'Unknown',
    };

    console.log('Generating thumbnail with invalid tournament data...');
    try {
      const thumbnailUrl3 = await generateTournamentThumbnail(invalidTournamentData);
      console.log('Tournament thumbnail generated successfully (unexpected)!');
      console.log('Thumbnail URL:', thumbnailUrl3);
    } catch (error) {
      console.log('Error caught as expected:', (error as any).message);
    }

    // Test case 4: Check if image exists (should skip generation)
    console.log('\n--- Test Case 4: Check if image exists (should skip generation) ---');
    console.log('Generating the same thumbnail again (should skip generation)...');
    const startTime4 = Date.now();
    const thumbnailUrl4 = await generateTournamentThumbnail(tournamentData1);
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
    const thumbnailUrl5 = await generateTournamentThumbnail(tournamentData1, {
      forceUpload: true,
    });
    const endTime5 = Date.now();

    console.log('Forced regeneration completed!');
    console.log('Thumbnail URL:', thumbnailUrl5);
    console.log(`Time taken: ${endTime5 - startTime5}ms (should be similar to first generation)`);

    console.log('\n--- All tests completed successfully ---');
  } catch (error) {
    console.error('Error testing tournament thumbnail generation:', error);
  }
}

// Run the test
testGenerateTournamentThumbnail();
