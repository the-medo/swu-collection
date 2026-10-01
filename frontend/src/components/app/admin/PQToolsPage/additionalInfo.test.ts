import { expect, test } from 'bun:test';
import { getPqAdditionalInfo } from './types.ts';
import { zTournamentCreateRequest } from '../../../../../../types/ZTournament.ts';

test('PQ creation preserves source links from old parser data and edited metadata from new data', () => {
  expect(getPqAdditionalInfo({ link: 'https://example.com/legacy' })).toEqual({
    sourceUrl: 'https://example.com/legacy',
  });
  const additionalInfo = {
    city: 'Paris',
    address: '10 Rue Test',
    postalCode: '01234',
    sourceUrl: 'https://example.com/edited',
    links: [{ label: 'Melee', url: 'https://melee.gg' }],
  };
  expect(getPqAdditionalInfo({ link: 'https://example.com/old', additionalInfo })).toEqual(
    additionalInfo,
  );
  const request = zTournamentCreateRequest.parse({
    type: 'pq',
    location: 'FR',
    continent: 'Europe',
    name: 'PQ - Paris, FR',
    attendance: 0,
    format: 1,
    days: 1,
    dayTwoPlayerCount: 0,
    date: '2026-09-29',
    additionalInfo,
  });
  expect(request.additionalInfo).toEqual(additionalInfo);
});
