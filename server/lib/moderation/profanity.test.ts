import { expect, test } from 'bun:test';
import cards from '../../db/json/card-list.json';
import { containsProfanity } from './profanity.ts';

test.each([
  'fuck',
  'FUCK',
  'fuuuuuck',
  'f.u.c.k',
  'f.u.c.k.',
  '_f_u_c_k_',
  '-f-u-c-k',
  'f*u*c*k',
  'f/u/c/k',
  "f'u'c'k",
  'f+u+c+k',
  'f,u,c,k',
  'f|u|c|k',
  'f. u. c. k.',
  's.h.i.t.',
  'f\u0336u\u0336c\u0336k\u0336',
  'f-u-c-k',
  'fu.ck',
  'f u c k',
  'f\u200bu\u200bc\u200bk',
  'ｆｕｃｋ',
  'fυck',
  'sh1t',
  'bullshit',
  'asshole',
  'bitch',
  'cunt',
  'nigger',
  'faggot',
  'go fuck yourself',
  'Fagan fuck',
  'slutspel shit',
  'twat',
])('rejects prohibited language: %s', value => {
  expect(containsProfanity(value)).toBe(true);
});

test.each([
  '',
  'Assassin',
  'Scunthorpe',
  'Dick Tracy',
  'Fu',
  'Fukuoka',
  'Dooku',
  'Classical tactics',
  'The ship attacks the base.',
  'Pass it to the next player.',
  'A tough matchup',
  'Damn, that was close!',
  'Hell of a game',
  'Sex and gender',
  'shitake mushrooms',
  'Push-it aggro',
  'Shi-tzu',
  'Shih-tzu',
  'Fagan',
  'Fagin',
  'Fagerström',
  'Shitara',
  'Wankel',
  'Twatt',
  'fire retardant',
  'hingga',
  'tinggal',
  'mangga',
  'slutspel',
  "People who're playing",
  'A/B testing',
  'X-wing / TIE-fighter',
  'I am a new player',
])('allows ordinary names, prose, and mild language: %s', value => {
  expect(containsProfanity(value)).toBe(false);
});

test('all official SWU card names remain usable in names, guides and discussions', () => {
  expect(
    Object.values(cards)
      .filter(card => containsProfanity(card.name))
      .map(card => card.name),
  ).toEqual([]);
});

test('matching is repeatable and does not mutate a caller string', () => {
  const value = 'Ｆｕｃｋ';
  for (let i = 0; i < 3; i++) expect(containsProfanity(value)).toBe(true);
  expect(value).toBe('Ｆｕｃｋ');
});

test('handles a maximum-size post with an unbroken word', () => {
  expect(containsProfanity('a'.repeat(256_000))).toBe(false);
});
